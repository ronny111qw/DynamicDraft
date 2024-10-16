'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarIcon, Clock, Building, Plus, ChevronLeft, ChevronRight, Trash2, Bell, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addDays, subMinutes } from 'date-fns'

type InterviewStatus = 'scheduled' | 'completed' | 'cancelled'

type Interview = {
  id: string
  date: string
  time: string
  company: string
  position: string
  type: string
  notes: string
  status: InterviewStatus
  reminder: boolean
  preparationTasks: { id: string; task: string; completed: boolean }[]
}

const defaultPreparationTasks = [
  { id: '1', task: 'Research the company', completed: false },
  { id: '2', task: 'Review job description', completed: false },
  { id: '3', task: 'Prepare questions for interviewer', completed: false },
  { id: '4', task: 'Practice common interview questions', completed: false },
  { id: '5', task: 'Prepare your STAR stories', completed: false },
]

export default function InterviewScheduler() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isAddingInterview, setIsAddingInterview] = useState(false)
  const [newInterview, setNewInterview] = useState<Partial<Interview>>({})
  const [activeTab, setActiveTab] = useState<InterviewStatus>('scheduled')
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)

  useEffect(() => {
    const savedInterviews = localStorage.getItem('interviews')
    if (savedInterviews) {
      setInterviews(JSON.parse(savedInterviews))
    }

    // Request notification permission
    if (Notification.permission !== 'granted') {
      Notification.requestPermission()
    }

    // Set up interval to check for reminders
    const intervalId = setInterval(checkReminders, 60000) // Check every minute

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    localStorage.setItem('interviews', JSON.stringify(interviews))
  }, [interviews])

  const checkReminders = () => {
    const now = new Date()
    interviews.forEach(interview => {
      if (interview.reminder) {
        const interviewDate = parseISO(`${interview.date}T${interview.time}`)
        const reminderDate = subMinutes(interviewDate, 5) // Remind 30 minutes before
        if (now >= reminderDate && now < interviewDate) {
          showNotification(interview)
        }
      }
    })
  }

  const showNotification = (interview: Interview) => {
    if (Notification.permission === 'granted') {
      new Notification('Interview Reminder', {
        body: `Your interview with ${interview.company} for ${interview.position} is in 30 minutes.`,
        icon: '/favicon.ico' // You can add a custom icon
      })
    }
  }

  const handleAddInterview = () => {
    if (!newInterview.company || !newInterview.time || !selectedDate) return

    const interview: Interview = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDate.toISOString(),
      time: newInterview.time || '',
      company: newInterview.company || '',
      position: newInterview.position || '',
      type: newInterview.type || 'onsite',
      notes: newInterview.notes || '',
      status: 'scheduled',
      reminder: true,
      preparationTasks: [...defaultPreparationTasks],
    }

    setInterviews([...interviews, interview])
    setIsAddingInterview(false)
    setNewInterview({})
  }

  const handleDeleteInterview = (id: string) => {
    setInterviews(interviews.filter(interview => interview.id !== id))
  }

  const handleUpdateInterviewStatus = (id: string, status: InterviewStatus) => {
    setInterviews(interviews.map(interview => 
      interview.id === id ? { ...interview, status } : interview
    ))
  }

  const handleToggleReminder = (id: string) => {
    setInterviews(interviews.map(interview => 
      interview.id === id ? { ...interview, reminder: !interview.reminder } : interview
    ))
  }

  const handleTogglePreparationTask = (interviewId: string, taskId: string) => {
    setInterviews(interviews.map(interview => 
      interview.id === interviewId ? {
        ...interview,
        preparationTasks: interview.preparationTasks.map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      } : interview
    ))
  }

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = monthStart
    const endDate = monthEnd

    const dateFormat = "d"
    const rows = []

    let days = []
    let day = startDate
    let formattedDate = ""

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate })

    daysInMonth.forEach((day) => {
      formattedDate = format(day, dateFormat)
      const cloneDay = new Date(day)
      const dayInterviews = interviews.filter(interview => isSameDay(parseISO(interview.date), day))
      days.push(
        <div
          className={`p-2 text-center cursor-pointer hover:bg-gray-100 rounded-full ${
            !isSameMonth(day, currentMonth) ? 'text-gray-400' : ''
          } ${
            isSameDay(day, selectedDate)
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : ''
          }`}
          key={day.toISOString()}
          onClick={() => setSelectedDate(cloneDay)}
        >
          {formattedDate}
          {dayInterviews.length > 0 && (
            <div className="flex justify-center mt-1 space-x-1">
              {dayInterviews.map((interview, index) => (
                <div
                  key={interview.id}
                  className={`w-1.5 h-1.5 rounded-full ${
                    interview.status === 'completed' ? 'bg-green-500' :
                    interview.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                ></div>
              ))}
            </div>
          )}
        </div>
      )
    })

    for (let i = 0; i < days.length; i += 7) {
      rows.push(
        <div className="grid grid-cols-7" key={i}>
          {days.slice(i, i + 7)}
        </div>
      )
    }

    return <div className="bg-background rounded-lg shadow p-4">{rows}</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Interview Calendar</CardTitle>
          <CardDescription>Schedule and manage your upcoming interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          {renderCalendar()}
          <Dialog open={isAddingInterview} onOpenChange={setIsAddingInterview}>
            <DialogTrigger asChild>
              <Button className="w-full mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Interview
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Interview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newInterview.company || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={newInterview.position || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, position: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newInterview.time || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Interview Type</Label>
                  <Select
                    value={newInterview.type || 'onsite'}
                    onValueChange={(value) => setNewInterview({ ...newInterview, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newInterview.notes || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, notes: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddInterview}>Schedule Interview</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Interviews</CardTitle>
            <CardDescription>Manage your interview schedule and preparation</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InterviewStatus)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
              <TabsContent value="scheduled">
                <InterviewList
                  interviews={interviews.filter(i => i.status === 'scheduled')}
                  onDelete={handleDeleteInterview}
                  onStatusChange={handleUpdateInterviewStatus}
                  onToggleReminder={handleToggleReminder}
                  onSelectInterview={setSelectedInterview}
                />
              </TabsContent>
              <TabsContent value="completed">
                <InterviewList
                  interviews={interviews.filter(i => i.status === 'completed')}
                  onDelete={handleDeleteInterview}
                  onStatusChange={handleUpdateInterviewStatus}
                  onToggleReminder={handleToggleReminder}
                  onSelectInterview={setSelectedInterview}
                />
              </TabsContent>
              <TabsContent value="cancelled">
                <InterviewList
                  interviews={interviews.filter(i => i.status === 'cancelled')}
                  onDelete={handleDeleteInterview}
                  onStatusChange={handleUpdateInterviewStatus}
                  onToggleReminder={handleToggleReminder}
                  onSelectInterview={setSelectedInterview}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {selectedInterview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Interview Preparation</CardTitle>
              <CardDescription>Prepare for your interview with {selectedInterview.company}</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Preparation Tasks</h3>
              {selectedInterview.preparationTasks.map(task => (
                <div key={task.id} className="flex items-center space-x-2 mb-2">
               <Checkbox
                    id={task.id}
                    checked={task.completed}
                    onCheckedChange={() => handleTogglePreparationTask(selectedInterview.id, task.id)}
                  />
                  <label
                    htmlFor={task.id}
                    className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {task.task}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

type InterviewListProps = {
  interviews: Interview[]
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: InterviewStatus) => void
  onToggleReminder: (id: string) => void
  onSelectInterview: (interview: Interview) => void
}

function InterviewList({ interviews, onDelete, onStatusChange, onToggleReminder, onSelectInterview }: InterviewListProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      {interviews
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((interview) => (
          <Card key={interview.id} className="mb-4 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{interview.company}</h3>
                  <p className="text-muted-foreground">{interview.position}</p>
                </div>
                <div className="flex space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleReminder(interview.id)}
                          className={interview.reminder ? 'text-blue-500' : 'text-muted-foreground'}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{interview.reminder ? 'Disable reminder' : 'Enable reminder'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(interview.id)}
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete interview</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center text-muted-foreground">
                  <CalendarIcon className="mr-1 h-4 w-4" />
                  {format(parseISO(interview.date), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  {interview.time}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Building className="mr-1 h-4 w-4" />
                  {interview.type}
                </div>
              </div>
              {interview.notes && (
                <p className="mt-2 text-muted-foreground text-sm">{interview.notes}</p>
              )}
              <div className="mt-4 flex justify-between items-center">
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant={interview.status === 'scheduled' ? 'default' : 'outline'}
                    onClick={() => onStatusChange(interview.id, 'scheduled')}
                  >
                    <HelpCircle className="mr-1 h-4 w-4" />
                    Scheduled
                  </Button>
                  <Button
                    size="sm"
                    variant={interview.status === 'completed' ? 'default' : 'outline'}
                    onClick={() => onStatusChange(interview.id, 'completed')}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Completed
                  </Button>
                  <Button
                    size="sm"
                    variant={interview.status === 'cancelled' ? 'default' : 'outline'}
                    onClick={() => onStatusChange(interview.id, 'cancelled')}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Cancelled
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="link"
                  onClick={() => onSelectInterview(interview)}
                >
                  Prepare
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
    </ScrollArea>
  )
}