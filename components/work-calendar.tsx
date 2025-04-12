"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  X,
  Save,
  User,
  UserPlus,
  FileSpreadsheet,
  Loader2,
  Edit,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@supabase/supabase-js"
import { format, parseISO } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our data
type Participant = {
  id: number
  name: string
}

type CalendarDate = {
  id: number
  date: string
  note: string
}

type AvailabilityStatus = "yes" | "no" | "maybe" | null

type AvailabilityMap = {
  [participantId: string]: {
    [dateId: string]: AvailabilityStatus
  }
}

export default function WorkCalendar() {
  const { toast } = useToast()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [dates, setDates] = useState<CalendarDate[]>([])
  const [availability, setAvailability] = useState<AvailabilityMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newParticipant, setNewParticipant] = useState("")
  const [multipleParticipants, setMultipleParticipants] = useState("")
  const [importedParticipants, setImportedParticipants] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newNote, setNewNote] = useState("")
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false)
  const [isAddMultipleParticipantsOpen, setIsAddMultipleParticipantsOpen] = useState(false)
  const [isImportParticipantsOpen, setIsImportParticipantsOpen] = useState(false)
  const [isAddDateOpen, setIsAddDateOpen] = useState(false)
  const [isAddDateRangeOpen, setIsAddDateRangeOpen] = useState(false)
  const [isAddRecurringDateOpen, setIsAddRecurringDateOpen] = useState(false)
  const [dateRangeStart, setDateRangeStart] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")
  const [dateRangeNote, setDateRangeNote] = useState("")
  const [recurringDate, setRecurringDate] = useState("")
  const [recurringCount, setRecurringCount] = useState(4)
  const [recurringNote, setRecurringNote] = useState("")
  const [isRenameParticipantOpen, setIsRenameParticipantOpen] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [newParticipantName, setNewParticipantName] = useState("")
  const [isEditDateOpen, setIsEditDateOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(null)
  const [editedDate, setEditedDate] = useState("")
  const [editedNote, setEditedNote] = useState("")

  // Initialize or fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch participants
        const { data: participantsData, error: participantsError } = await supabase
          .from("participants")
          .select("*")
          .order("name")

        if (participantsError) throw participantsError

        // Fetch dates
        const { data: datesData, error: datesError } = await supabase.from("calendar_dates").select("*").order("date")

        if (datesError) throw datesError

        // Fetch availability
        const { data: availabilityData, error: availabilityError } = await supabase.from("availability").select("*")

        if (availabilityError) throw availabilityError

        // Process the data
        setParticipants(participantsData || [])
        setDates(datesData || [])

        // Convert availability data to our map structure
        const availabilityMap: AvailabilityMap = {}

        participantsData?.forEach((participant) => {
          availabilityMap[participant.id] = {}
          datesData?.forEach((date) => {
            availabilityMap[participant.id][date.id] = null
          })
        })

        availabilityData?.forEach((record) => {
          if (availabilityMap[record.participant_id]) {
            availabilityMap[record.participant_id][record.date_id] = record.status as AvailabilityStatus
          }
        })

        setAvailability(availabilityMap)

        // If no data exists, seed with sample data
        if (participantsData?.length === 0 && datesData?.length === 0) {
          await seedSampleData()
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load calendar data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Seed sample data if the database is empty
  const seedSampleData = async () => {
    try {
      // Sample participants
      const sampleParticipants = ["Anna", "Boris", "Clara", "David"]

      // Sample dates
      const sampleDates = [
        { date: "2025-04-10", note: "Kroměříž" },
        { date: "2025-04-11", note: "" },
        { date: "2025-04-12", note: "Veverská Bítýška festival" },
        { date: "2025-04-13", note: "" },
      ]

      // Insert participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("participants")
        .insert(sampleParticipants.map((name) => ({ name })))
        .select()

      if (participantsError) throw participantsError

      // Insert dates
      const { data: datesData, error: datesError } = await supabase
        .from("calendar_dates")
        .insert(sampleDates.map(({ date, note }) => ({ date, note })))
        .select()

      if (datesError) throw datesError

      // Reload the data
      window.location.reload()
    } catch (error) {
      console.error("Error seeding sample data:", error)
      toast({
        title: "Error",
        description: "Failed to seed sample data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateStatus = async (participantId: number, dateId: number, status: AvailabilityStatus) => {
    try {
      // Update local state first for immediate feedback
      setAvailability((prev) => ({
        ...prev,
        [participantId]: {
          ...prev[participantId],
          [dateId]: status,
        },
      }))

      // Update in database
      if (status === null) {
        // Delete the record if status is null
        const { error } = await supabase
          .from("availability")
          .delete()
          .match({ participant_id: participantId, date_id: dateId })

        if (error) throw error
      } else {
        // Upsert the record
        const { error } = await supabase.from("availability").upsert({
          participant_id: participantId,
          date_id: dateId,
          status,
        })

        if (error) throw error
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to save your changes. Please try again.",
        variant: "destructive",
      })

      // Revert the local state change
      setAvailability((prev) => {
        const updated = { ...prev }
        // Try to get the previous value from the server again
        supabase
          .from("availability")
          .select("*")
          .match({ participant_id: participantId, date_id: dateId })
          .single()
          .then(({ data }) => {
            if (data) {
              updated[participantId][dateId] = data.status as AvailabilityStatus
              setAvailability(updated)
            }
          })
        return updated
      })
    }
  }

  const addParticipant = async () => {
    if (!newParticipant.trim()) return

    try {
      // Insert into database
      const { data, error } = await supabase.from("participants").insert({ name: newParticipant.trim() }).select()

      if (error) throw error

      if (data && data.length > 0) {
        const newParticipantData = data[0]

        // Update local state
        setParticipants((prev) => [...prev, newParticipantData])

        // Initialize availability for new participant
        setAvailability((prev) => {
          const updated = { ...prev }
          updated[newParticipantData.id] = {}
          dates.forEach((date) => {
            updated[newParticipantData.id][date.id] = null
          })
          return updated
        })

        setNewParticipant("")
        setIsAddParticipantOpen(false)

        toast({
          title: "Participant added",
          description: `${newParticipantData.name} has been added to the calendar.`,
        })
      }
    } catch (error) {
      console.error("Error adding participant:", error)
      toast({
        title: "Error",
        description: "Failed to add participant. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addMultipleParticipants = async () => {
    if (!multipleParticipants.trim()) return

    try {
      const newPeople = multipleParticipants
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name.length > 0)

      if (newPeople.length === 0) return

      // Filter out duplicates with existing participants
      const existingParticipantNames = new Set(participants.map((p) => p.name))
      const uniqueNewPeople = newPeople.filter((name) => !existingParticipantNames.has(name))

      if (uniqueNewPeople.length === 0) {
        toast({
          title: "No new participants",
          description: "All the participants you entered already exist.",
        })
        return
      }

      // Insert into database
      const { data, error } = await supabase
        .from("participants")
        .insert(uniqueNewPeople.map((name) => ({ name })))
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        // Update local state
        setParticipants((prev) => [...prev, ...data])

        // Initialize availability for new participants
        setAvailability((prev) => {
          const updated = { ...prev }
          data.forEach((participant) => {
            updated[participant.id] = {}
            dates.forEach((date) => {
              updated[participant.id][date.id] = null
            })
          })
          return updated
        })

        setMultipleParticipants("")
        setIsAddMultipleParticipantsOpen(false)

        toast({
          title: "Participants added",
          description: `${data.length} participants have been added to the calendar.`,
        })
      }
    } catch (error) {
      console.error("Error adding multiple participants:", error)
      toast({
        title: "Error",
        description: "Failed to add participants. Please try again.",
        variant: "destructive",
      })
    }
  }

  const importParticipants = async () => {
    if (!importedParticipants.trim()) return

    try {
      // Simple CSV parsing (name,email)
      const newPeople = importedParticipants
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [name] = line.split(",")
          return name.trim()
        })
        .filter((name) => name.length > 0)

      if (newPeople.length === 0) return

      // Filter out duplicates with existing participants
      const existingParticipantNames = new Set(participants.map((p) => p.name))
      const uniqueNewPeople = newPeople.filter((name) => !existingParticipantNames.has(name))

      if (uniqueNewPeople.length === 0) {
        toast({
          title: "No new participants",
          description: "All the participants you imported already exist.",
        })
        return
      }

      // Insert into database
      const { data, error } = await supabase
        .from("participants")
        .insert(uniqueNewPeople.map((name) => ({ name })))
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        // Update local state
        setParticipants((prev) => [...prev, ...data])

        // Initialize availability for new participants
        setAvailability((prev) => {
          const updated = { ...prev }
          data.forEach((participant) => {
            updated[participant.id] = {}
            dates.forEach((date) => {
              updated[participant.id][date.id] = null
            })
          })
          return updated
        })

        setImportedParticipants("")
        setIsImportParticipantsOpen(false)

        toast({
          title: "Participants imported",
          description: `${data.length} participants have been imported to the calendar.`,
        })
      }
    } catch (error) {
      console.error("Error importing participants:", error)
      toast({
        title: "Import error",
        description: "There was an error importing participants. Please check the format and try again.",
        variant: "destructive",
      })
    }
  }

  const addDate = async () => {
    if (!newDate) return

    try {
      // Insert into database
      const { data, error } = await supabase.from("calendar_dates").insert({ date: newDate, note: newNote }).select()

      if (error) throw error

      if (data && data.length > 0) {
        const newDateData = data[0]

        // Update local state
        setDates((prev) => [...prev, newDateData])

        // Initialize availability for new date
        setAvailability((prev) => {
          const updated = { ...prev }
          participants.forEach((p) => {
            if (!updated[p.id]) updated[p.id] = {}
            updated[p.id][newDateData.id] = null
          })
          return updated
        })

        setNewDate("")
        setNewNote("")
        setIsAddDateOpen(false)

        toast({
          title: "Date added",
          description: `${format(parseISO(newDateData.date), "MMM d, yyyy")} has been added to the calendar.`,
        })
      }
    } catch (error) {
      console.error("Error adding date:", error)
      toast({
        title: "Error",
        description: "Failed to add date. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addDateRange = async () => {
    if (!dateRangeStart || !dateRangeEnd) return

    try {
      const start = new Date(dateRangeStart)
      const end = new Date(dateRangeEnd)

      if (start > end) {
        toast({
          title: "Invalid date range",
          description: "End date must be after start date.",
          variant: "destructive",
        })
        return
      }

      const newDates = []
      let currentDate = start

      while (currentDate <= end) {
        const dateString = currentDate.toISOString().split("T")[0]
        newDates.push({ date: dateString, note: dateRangeNote })
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
      }

      // Filter out any duplicates with existing dates
      const existingDateStrings = new Set(dates.map((d) => d.date))
      const filteredNewDates = newDates.filter((d) => !existingDateStrings.has(d.date))

      if (filteredNewDates.length === 0) {
        toast({
          title: "No new dates",
          description: "All the dates in this range already exist.",
        })
        return
      }

      // Insert into database
      const { data, error } = await supabase.from("calendar_dates").insert(filteredNewDates).select()

      if (error) throw error

      if (data && data.length > 0) {
        // Update local state
        setDates((prev) => [...prev, ...data])

        // Initialize availability for new dates
        setAvailability((prev) => {
          const updated = { ...prev }
          participants.forEach((p) => {
            if (!updated[p.id]) updated[p.id] = {}
            data.forEach((date) => {
              updated[p.id][date.id] = null
            })
          })
          return updated
        })

        setDateRangeStart("")
        setDateRangeEnd("")
        setDateRangeNote("")
        setIsAddDateRangeOpen(false)

        toast({
          title: "Date range added",
          description: `${data.length} dates have been added to the calendar.`,
        })
      }
    } catch (error) {
      console.error("Error adding date range:", error)
      toast({
        title: "Error",
        description: "Failed to add date range. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addRecurringDates = async () => {
    if (!recurringDate || recurringCount <= 0) return

    try {
      const startDate = new Date(recurringDate)
      const newDates = []

      for (let i = 0; i < recurringCount; i++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + i * 7) // Weekly recurrence
        const dateString = currentDate.toISOString().split("T")[0]
        newDates.push({ date: dateString, note: recurringNote })
      }

      // Filter out any duplicates with existing dates
      const existingDateStrings = new Set(dates.map((d) => d.date))
      const filteredNewDates = newDates.filter((d) => !existingDateStrings.has(d.date))

      if (filteredNewDates.length === 0) {
        toast({
          title: "No new dates",
          description: "All the recurring dates already exist.",
        })
        return
      }

      // Insert into database
      const { data, error } = await supabase.from("calendar_dates").insert(filteredNewDates).select()

      if (error) throw error

      if (data && data.length > 0) {
        // Update local state
        setDates((prev) => [...prev, ...data])

        // Initialize availability for new dates
        setAvailability((prev) => {
          const updated = { ...prev }
          participants.forEach((p) => {
            if (!updated[p.id]) updated[p.id] = {}
            data.forEach((date) => {
              updated[p.id][date.id] = null
            })
          })
          return updated
        })

        setRecurringDate("")
        setRecurringCount(4)
        setRecurringNote("")
        setIsAddRecurringDateOpen(false)

        toast({
          title: "Recurring dates added",
          description: `${data.length} weekly recurring dates have been added to the calendar.`,
        })
      }
    } catch (error) {
      console.error("Error adding recurring dates:", error)
      toast({
        title: "Error",
        description: "Failed to add recurring dates. Please try again.",
        variant: "destructive",
      })
    }
  }

  const renameParticipant = async () => {
    if (!selectedParticipant || !newParticipantName.trim()) return

    try {
      // Update in database
      const { error } = await supabase
        .from("participants")
        .update({ name: newParticipantName.trim() })
        .eq("id", selectedParticipant.id)

      if (error) throw error

      // Update in local state
      setParticipants((prev) =>
        prev.map((p) => (p.id === selectedParticipant.id ? { ...p, name: newParticipantName.trim() } : p)),
      )

      setIsRenameParticipantOpen(false)
      setSelectedParticipant(null)
      setNewParticipantName("")

      toast({
        title: "Participant renamed",
        description: `Participant has been renamed to ${newParticipantName.trim()}.`,
      })
    } catch (error) {
      console.error("Error renaming participant:", error)
      toast({
        title: "Error",
        description: "Failed to rename participant. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateDate = async () => {
    if (!selectedDate || !editedDate) return

    try {
      // Update in database
      const { error } = await supabase
        .from("calendar_dates")
        .update({ date: editedDate, note: editedNote })
        .eq("id", selectedDate.id)

      if (error) throw error

      // Update in local state
      setDates((prev) => prev.map((d) => (d.id === selectedDate.id ? { ...d, date: editedDate, note: editedNote } : d)))

      setIsEditDateOpen(false)
      setSelectedDate(null)
      setEditedDate("")
      setEditedNote("")

      toast({
        title: "Date updated",
        description: `Date has been updated to ${format(parseISO(editedDate), "MMM d, yyyy")}.`,
      })
    } catch (error) {
      console.error("Error updating date:", error)
      toast({
        title: "Error",
        description: "Failed to update date. Please try again.",
        variant: "destructive",
      })
    }
  }

  const saveAllData = async () => {
    try {
      setSaving(true)

      // All individual updates are already saved to the database
      // This function is now just a visual confirmation

      toast({
        title: "Saved",
        description: "All changes have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving data:", error)
      toast({
        title: "Error",
        description: "Failed to save your changes. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  const getButtonColor = (status: AvailabilityStatus) => {
    switch (status) {
      case "yes":
        return "bg-green-500 hover:bg-green-600"
      case "no":
        return "bg-red-500 hover:bg-red-600"
      case "maybe":
        return "bg-amber-400 hover:bg-amber-500"
      default:
        return "bg-gray-200 hover:bg-gray-300"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, "MMM d, EEE")
    } catch (e) {
      return dateString
    }
  }

  // Calculate availability summary for each date
  const getDateSummary = (dateId: number) => {
    const summary = { yes: 0, no: 0, maybe: 0, unknown: 0 }

    participants.forEach((p) => {
      const status = availability[p.id]?.[dateId]
      if (status === "yes") summary.yes++
      else if (status === "no") summary.no++
      else if (status === "maybe") summary.maybe++
      else summary.unknown++
    })

    return summary
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading calendar...</p>
      </div>
    )
  }

  return (
    <div className="w-full border rounded-lg shadow-sm">
      <div className="flex flex-row items-center justify-between p-6 border-b">
        <h2 className="text-2xl font-semibold">Work Calendar</h2>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">+ Add Person</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Add Participants</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsAddParticipantOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Individual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddMultipleParticipantsOpen(true)}>
                <User className="h-4 w-4 mr-2" />
                Add Multiple
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportParticipantsOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import from CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">+ Add Date</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Add Dates</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsAddDateOpen(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Single Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddDateRangeOpen(true)}>
                <CalendarRange className="h-4 w-4 mr-2" />
                Date Range
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddRecurringDateOpen(true)}>
                <CalendarDays className="h-4 w-4 mr-2" />
                Recurring Dates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddParticipantOpen} onOpenChange={setIsAddParticipantOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Participant</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    placeholder="Enter name"
                  />
                </div>
              </div>
              <Button onClick={addParticipant}>Add Participant</Button>
            </DialogContent>
          </Dialog>

          <Button
            onClick={saveAllData}
            variant="default"
            size="default"
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="p-6 flex">
        {/* Main content - left side */}
        <div className="flex-1 pr-4">
          <Tabs defaultValue="calendar">
            <TabsList className="mb-4">
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="summary">Summary View</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-4">
              <div className="overflow-y-auto max-h-[600px]">
                <div className="flex flex-col space-y-4">
                  {dates.map((date) => (
                    <div
                      key={date.id}
                      id={`date-${date.id}`}
                      className="border rounded-md p-4 transition-colors duration-300"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-lg font-medium">
                          {formatDate(date.date)}
                          {date.note && <span className="ml-2 text-sm text-muted-foreground">({date.note})</span>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedDate(date)
                            setEditedDate(date.date)
                            setEditedNote(date.note)
                            setIsEditDateOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit Date</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                        {participants.map((p) => (
                          <div key={`${p.id}-${date.id}`} className="flex items-center border rounded-md p-2 relative">
                            <div className="flex-shrink-0 mr-2">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                            <div
                              className="text-sm font-medium truncate mr-2 cursor-pointer hover:bg-gray-50 group relative"
                              onClick={(e) => {
                                // Toggle a data attribute to track expanded state
                                const isExpanded = e.currentTarget.getAttribute("data-expanded") === "true"
                                if (isExpanded) {
                                  e.currentTarget.setAttribute("data-expanded", "false")
                                  e.currentTarget.classList.add("truncate")
                                  e.currentTarget.classList.remove("whitespace-normal")
                                } else {
                                  e.currentTarget.setAttribute("data-expanded", "true")
                                  e.currentTarget.classList.remove("truncate")
                                  e.currentTarget.classList.add("whitespace-normal")

                                  // Show toast with full name
                                  toast({
                                    title: "Full Name",
                                    description: p.name,
                                    duration: 3000,
                                  })
                                }
                              }}
                              data-expanded="false"
                              title="Click to show full name, right-click to rename"
                              onContextMenu={(e) => {
                                e.preventDefault()
                                // Set up for rename
                                setSelectedParticipant(p)
                                setNewParticipantName(p.name)
                                setIsRenameParticipantOpen(true)
                              }}
                            >
                              {p.name}
                              <div className="absolute right-0 top-0 bottom-0 w-6 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                <Edit
                                  className="h-3 w-3 text-gray-500 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedParticipant(p)
                                    setNewParticipantName(p.name)
                                    setIsRenameParticipantOpen(true)
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex ml-auto gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className={`w-6 h-6 p-0 ${getButtonColor(
                                        availability[p.id]?.[date.id] === "yes" ? "yes" : null,
                                      )}`}
                                      onClick={() =>
                                        updateStatus(
                                          p.id,
                                          date.id,
                                          availability[p.id]?.[date.id] === "yes" ? null : "yes",
                                        )
                                      }
                                    >
                                      {availability[p.id]?.[date.id] === "yes" ? (
                                        <Check className="h-3 w-3 text-white" />
                                      ) : (
                                        <Check className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Available</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className={`w-6 h-6 p-0 ${getButtonColor(
                                        availability[p.id]?.[date.id] === "no" ? "no" : null,
                                      )}`}
                                      onClick={() =>
                                        updateStatus(
                                          p.id,
                                          date.id,
                                          availability[p.id]?.[date.id] === "no" ? null : "no",
                                        )
                                      }
                                    >
                                      {availability[p.id]?.[date.id] === "no" ? (
                                        <X className="h-3 w-3 text-white" />
                                      ) : (
                                        <X className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Not Available</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary">
              <div className="space-y-4">
                {dates.map((date) => {
                  const summary = getDateSummary(date.id)
                  return (
                    <div key={date.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h3 className="text-lg font-medium">{formatDate(date.date)}</h3>
                          {date.note && <p className="text-sm text-muted-foreground">{date.note}</p>}
                        </div>

                        <div className="flex gap-3">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm">{summary.yes} Yes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm">{summary.no} No</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                            <span className="text-sm">{summary.maybe} Maybe</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                            <span className="text-sm">{summary.unknown} Unknown</span>
                          </div>
                        </div>
                      </div>

                      {summary.yes > 0 && (
                        <div className="mt-3 bg-green-50 p-3 rounded-md border border-green-200">
                          <h4 className="text-sm font-medium text-green-800 mb-1">Available Participants:</h4>
                          <p className="text-green-800">
                            {participants
                              .filter((p) => availability[p.id]?.[date.id] === "yes")
                              .map((p) => p.name)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="w-64 border-l pl-4 flex-shrink-0">
          <h3 className="font-medium mb-3">Upcoming Dates</h3>
          <div className="space-y-2">
            {dates.map((date) => (
              <div
                key={date.id}
                className="p-2 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  const element = document.getElementById(`date-${date.id}`)
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" })
                    element.classList.add("bg-muted")
                    setTimeout(() => element.classList.remove("bg-muted"), 1500)
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{formatDate(date.date)}</div>
                    {date.note && <div className="text-xs text-muted-foreground mt-1">{date.note}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isAddMultipleParticipantsOpen} onOpenChange={setIsAddMultipleParticipantsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Multiple Participants</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="names">Names (one per line)</Label>
              <Input
                id="names"
                value={multipleParticipants}
                onChange={(e) => setMultipleParticipants(e.target.value)}
                placeholder="Enter names, one per line"
                className="min-h-[100px]"
              />
            </div>
          </div>
          <Button onClick={addMultipleParticipants}>Add Participants</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportParticipantsOpen} onOpenChange={setIsImportParticipantsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Participants from CSV</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="csv">CSV Data (name,email)</Label>
              <Input
                id="csv"
                value={importedParticipants}
                onChange={(e) => setImportedParticipants(e.target.value)}
                placeholder="Enter CSV data (name,email), one per line"
                className="min-h-[100px]"
              />
            </div>
          </div>
          <Button onClick={importParticipants}>Import Participants</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDateOpen} onOpenChange={setIsAddDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Date</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                type="date"
                id="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="Enter date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Enter note" />
            </div>
          </div>
          <Button onClick={addDate}>Add Date</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDateRangeOpen} onOpenChange={setIsAddDateRangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Date Range</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                type="date"
                id="start-date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                placeholder="Enter start date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                type="date"
                id="end-date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                placeholder="Enter end date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="range-note">Note</Label>
              <Input
                id="range-note"
                value={dateRangeNote}
                onChange={(e) => setDateRangeNote(e.target.value)}
                placeholder="Enter note for the date range"
              />
            </div>
          </div>
          <Button onClick={addDateRange}>Add Date Range</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddRecurringDateOpen} onOpenChange={setIsAddRecurringDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recurring Dates (Weekly)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="recurring-date">Start Date</Label>
              <Input
                type="date"
                id="recurring-date"
                value={recurringDate}
                onChange={(e) => setRecurringDate(e.target.value)}
                placeholder="Enter start date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recurring-count">Number of Occurrences</Label>
              <Input
                type="number"
                id="recurring-count"
                value={recurringCount}
                onChange={(e) => setRecurringCount(Number.parseInt(e.target.value))}
                placeholder="Enter number of occurrences"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recurring-note">Note</Label>
              <Input
                id="recurring-note"
                value={recurringNote}
                onChange={(e) => setRecurringNote(e.target.value)}
                placeholder="Enter note for the recurring dates"
              />
            </div>
          </div>
          <Button onClick={addRecurringDates}>Add Recurring Dates</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameParticipantOpen} onOpenChange={setIsRenameParticipantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Participant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-name">New Name</Label>
              <Input
                id="new-name"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
          </div>
          <Button onClick={renameParticipant}>Rename Participant</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDateOpen} onOpenChange={setIsEditDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Date</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                type="date"
                id="edit-date"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
                placeholder="Enter date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-note">Note</Label>
              <Input
                id="edit-note"
                value={editedNote}
                onChange={(e) => setEditedNote(e.target.value)}
                placeholder="Enter note"
              />
            </div>
          </div>
          <Button onClick={updateDate}>Update Date</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
