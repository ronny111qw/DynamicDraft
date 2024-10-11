import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Building, ChevronRight, Plus, Trash2, Bell } from 'lucide-react';

type Interview = {
  id: string;
  date: Date;
  time: string;
  company: string;
  position: string;
  type: string;
  notes: string;
  checklist: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  reminder: number; // hours before interview
}

const defaultChecklist = [
  { id: '1', text: 'Research company background', completed: false },
  { id: '2', text: 'Review job description', completed: false },
  { id: '3', text: 'Prepare STAR answers', completed: false },
  { id: '4', text: 'Choose interview outfit', completed: false },
  { id: '5', text: 'Test technical equipment', completed: false },
];

export default function InterviewScheduler() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddingInterview, setIsAddingInterview] = useState(false);
  const [newInterview, setNewInterview] = useState<Partial<Interview>>({
    checklist: defaultChecklist,
    reminder: 24,
  });

  useEffect(() => {
    // Load interviews from localStorage
    const savedInterviews = localStorage.getItem('interviews');
    if (savedInterviews) {
      setInterviews(JSON.parse(savedInterviews).map(interview => ({
        ...interview,
        date: new Date(interview.date)
      })));
    }
  }, []);

  useEffect(() => {
    // Save interviews to localStorage
    localStorage.setItem('interviews', JSON.stringify(interviews));
  }, [interviews]);

  const handleAddInterview = () => {
    if (!newInterview.company || !newInterview.time || !selectedDate) return;

    const interview: Interview = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDate,
      time: newInterview.time || '',
      company: newInterview.company || '',
      position: newInterview.position || '',
      type: newInterview.type || 'onsite',
      notes: newInterview.notes || '',
      checklist: newInterview.checklist || defaultChecklist,
      reminder: newInterview.reminder || 24,
    };

    setInterviews([...interviews, interview]);
    setIsAddingInterview(false);
    setNewInterview({
      checklist: defaultChecklist,
      reminder: 24,
    });
  };

  const updateChecklist = (interviewId: string, checklistItemId: string) => {
    setInterviews(interviews.map(interview => {
      if (interview.id === interviewId) {
        return {
          ...interview,
          checklist: interview.checklist.map(item => 
            item.id === checklistItemId ? { ...item, completed: !item.completed } : item
          )
        };
      }
      return interview;
    }));
  };

  const deleteInterview = (id: string) => {
    setInterviews(interviews.filter(interview => interview.id !== id));
  };

  const getUpcomingInterviews = () => {
    return interviews
      .filter(interview => new Date(interview.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Interview Calendar</CardTitle>
          <CardDescription className="text-gray-400">Schedule and manage your upcoming interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="text-white"
          />
          <Dialog open={isAddingInterview} onOpenChange={setIsAddingInterview}>
            <DialogTrigger asChild>
              <Button className="w-full mt-4 bg-green-500 text-black hover:bg-green-600">
                <Plus className="mr-2 h-4 w-4" />
                Add Interview
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 text-white border-gray-800">
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
                    className="bg-gray-800 text-white border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={newInterview.position || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, position: e.target.value })}
                    className="bg-gray-800 text-white border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newInterview.time || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, time: e.target.value })}
                    className="bg-gray-800 text-white border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Interview Type</Label>
                  <Select
                    value={newInterview.type || 'onsite'}
                    onValueChange={(value) => setNewInterview({ ...newInterview, type: value })}
                  >
                    <SelectTrigger className="bg-gray-800 text-white border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reminder">Reminder</Label>
                  <Select
                    value={String(newInterview.reminder || 24)}
                    onValueChange={(value) => setNewInterview({ ...newInterview, reminder: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-gray-800 text-white border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="1">1 hour before</SelectItem>
                      <SelectItem value="24">24 hours before</SelectItem>
                      <SelectItem value="48">48 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newInterview.notes || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, notes: e.target.value })}
                    className="bg-gray-800 text-white border-gray-700"
                  />
                </div>
                <Button onClick={handleAddInterview} className="w-full bg-green-500 text-black hover:bg-green-600">
                  Schedule Interview
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Upcoming Interviews</CardTitle>
          <CardDescription className="text-gray-400">Manage your interview schedule and preparation</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {getUpcomingInterviews().map((interview) => (
              <Card key={interview.id} className="mb-4 bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{interview.company}</h3>
                      <p className="text-gray-400">{interview.position}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <div className="flex items-center text-gray-400">
                          <CalendarDays className="mr-1 h-4 w-4" />
                          {interview.date.toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Clock className="mr-1 h-4 w-4" />
                          {interview.time}
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Building className="mr-1 h-4 w-4" />
                          {interview.type}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteInterview(interview.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">Preparation Checklist</h4>
                    {interview.checklist.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${interview.id}-${item.id}`}
                          checked={item.completed}
                          onCheckedChange={() => updateChecklist(interview.id, item.id)}
                          className="border-gray-600"
                        />
                        <label
                          htmlFor={`${interview.id}-${item.id}`}
                          className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}
                        >
                          {item.text}
                        </label>
                      </div>
                    ))}
                  </div>
                  {interview.notes && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-white mb-1">Notes</h4>
                      <p className="text-gray-400 text-sm">{interview.notes}</p>
                    </div>
                  )}
                  <div className="mt-4 flex items-center text-gray-400">
                    <Bell className="mr-2 h-4 w-4" />
                    Reminder set for {interview.reminder} hours before
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}