import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  Video,
  Phone,
  Brain,
  Sparkles,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, isSameDay, isToday } from 'date-fns';

// Time Slot Component
interface TimeSlotProps {
  time: string;
  available: boolean;
  suggested?: boolean;
  selected: boolean;
  onClick: () => void;
}

const TimeSlot: React.FC<TimeSlotProps> = ({ time, available, suggested, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={cn(
        "w-full px-3 py-2 text-sm font-medium rounded-lg transition-all relative",
        {
          "bg-primary text-primary-foreground shadow-sm": selected,
          "bg-background border border-input hover:bg-accent hover:text-accent-foreground": 
            available && !selected,
          "bg-muted text-muted-foreground cursor-not-allowed": !available,
          "ring-2 ring-blue-500 ring-offset-2": suggested && !selected,
        }
      )}
    >
      {time}
      {suggested && !selected && (
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-3 w-3 text-blue-500" />
        </div>
      )}
    </button>
  );
};

// Calendar Day Component
interface CalendarDayProps {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  hasEvents: boolean;
  onClick: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ 
  date, 
  isSelected, 
  isToday, 
  isCurrentMonth, 
  hasEvents, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full h-10 text-sm font-medium rounded-lg transition-all",
        {
          "bg-primary text-primary-foreground": isSelected,
          "bg-background hover:bg-accent hover:text-accent-foreground": 
            !isSelected && isCurrentMonth,
          "text-muted-foreground": !isCurrentMonth,
          "ring-2 ring-blue-500 ring-offset-1": isToday && !isSelected,
        }
      )}
    >
      {format(date, 'd')}
      {hasEvents && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
          <div className="w-1 h-1 bg-current rounded-full" />
        </div>
      )}
    </button>
  );
};

// AI Suggestions Panel
const AISchedulingSuggestions: React.FC<{ selectedDate: Date | null }> = ({ selectedDate }) => {
  const suggestions = [
    {
      time: '10:00 AM',
      reason: 'Best productivity time based on your calendar',
      confidence: 95,
      type: 'optimal'
    },
    {
      time: '2:00 PM',
      reason: 'No conflicts with existing meetings',
      confidence: 88,
      type: 'available'
    },
    {
      time: '4:30 PM',
      reason: 'Good for follow-up discussions',
      confidence: 75,
      type: 'contextual'
    }
  ];

  const typeColors = {
    optimal: 'bg-green-100 text-green-700 border-green-200',
    available: 'bg-blue-100 text-blue-700 border-blue-200',
    contextual: 'bg-purple-100 text-purple-700 border-purple-200'
  };

  const typeIcons = {
    optimal: <CheckCircle className="h-4 w-4" />,
    available: <Clock className="h-4 w-4" />,
    contextual: <Brain className="h-4 w-4" />
  };

  return (
    <div className="p-6 border-l bg-card/50 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Suggestions</h3>
        </div>
        
        {selectedDate ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Recommended times for {format(selectedDate, 'EEEE, MMMM d')}
            </p>
            
            {suggestions.map((suggestion, index) => (
              <div key={index} className="p-3 rounded-lg border bg-background/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {typeIcons[suggestion.type as keyof typeof typeIcons]}
                    <span className="font-medium text-sm">{suggestion.time}</span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                    typeColors[suggestion.type as keyof typeof typeColors]
                  )}>
                    {suggestion.confidence}% match
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                <button className="w-full px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors">
                  Use this time
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a date to see AI-powered scheduling suggestions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Meeting Details Form
interface MeetingDetailsProps {
  selectedDate: Date | null;
  selectedTime: string | null;
}

const MeetingDetailsForm: React.FC<MeetingDetailsProps> = ({ selectedDate, selectedTime }) => {
  const [meetingType, setMeetingType] = useState<'video' | 'phone' | 'in-person'>('video');
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState('');

  const meetingTypeOptions = [
    { type: 'video', icon: <Video className="h-4 w-4" />, label: 'Video Call' },
    { type: 'phone', icon: <Phone className="h-4 w-4" />, label: 'Phone Call' },
    { type: 'in-person', icon: <MapPin className="h-4 w-4" />, label: 'In Person' }
  ];

  return (
    <div className="p-6 border-t bg-background/50 backdrop-blur-sm">
      <h3 className="font-semibold text-foreground mb-4">Meeting Details</h3>
      
      {selectedDate && selectedTime ? (
        <div className="space-y-4">
          {/* Selected Time Display */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center space-x-2 text-primary">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium text-sm">
                {format(selectedDate, 'EEEE, MMMM d')} at {selectedTime}
              </span>
            </div>
          </div>

          {/* Meeting Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Meeting Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter meeting title..."
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Meeting Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Meeting Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {meetingTypeOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setMeetingType(option.type as any)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    meetingType === option.type
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-input hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Attendees
            </label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Enter email addresses..."
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Schedule Button */}
          <button className="w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
            Schedule Meeting
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Select a date and time to configure meeting details
          </p>
        </div>
      )}
    </div>
  );
};

// CalendarEvent interface to match the usage
interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end?: string
  type: 'task' | 'event'
  status?: string
  priority?: string
  category?: string
  ai_generated?: boolean
  confidence_score?: number
  estimated_duration?: number
  source: 'tasks' | 'calendar'
}

// Props interface for the component
interface ModernCalendarSchedulerProps {
  selectedDate?: Date
  onDateChange?: (date: Date) => void
  events?: CalendarEvent[]
}

// Main Calendar Scheduler Component
export const ModernCalendarScheduler: React.FC<ModernCalendarSchedulerProps> = ({ 
  selectedDate: propSelectedDate, 
  onDateChange, 
  events = [] 
}) => {
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  
  // Use prop selectedDate if provided, otherwise use internal state
  const selectedDate = propSelectedDate || internalSelectedDate;

  // Generate time slots
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = Math.floor((i * 30) / 60) + 9;
    const minute = (i * 30) % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  // Sample availability data
  const isTimeAvailable = (date: Date, time: string): boolean => {
    // Mock logic for availability
    const dayOfWeek = date.getDay();
    const timeHour = parseInt(time.split(':')[0]);
    
    // Weekends are less available
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return timeHour >= 10 && timeHour <= 16 && Math.random() > 0.3;
    }
    
    // Lunch time less available
    if (timeHour >= 12 && timeHour <= 13) {
      return Math.random() > 0.7;
    }
    
    return Math.random() > 0.2;
  };

  // AI suggested times
  const isSuggestedTime = (time: string): boolean => {
    return ['10:00', '14:00', '16:30'].includes(time);
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
    const newDate = null;
    if (onDateChange && newDate) {
      onDateChange(newDate);
    } else {
      setInternalSelectedDate(newDate);
    }
    setSelectedTime(null);
  };

  const handleDateSelect = (date: Date) => {
    if (onDateChange) {
      onDateChange(date);
    } else {
      setInternalSelectedDate(date);
    }
    setSelectedTime(null);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Calendar Section */}
      <div className="flex-1 flex flex-col">
        {/* Calendar Header */}
        <div className="p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Schedule Meeting</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-lg font-semibold text-foreground min-w-[200px] text-center">
                {format(currentWeek, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Week View */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date, index) => (
              <div key={index} className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {format(date, 'EEE')}
                </div>
                <CalendarDay
                  date={date}
                  isSelected={selectedDate ? isSameDay(date, selectedDate) : false}
                  isToday={isToday(date)}
                  isCurrentMonth={true}
                  hasEvents={events.some(event => isSameDay(new Date(event.start), date))}
                  onClick={() => handleDateSelect(date)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div className="flex-1 p-6 overflow-auto">
          {selectedDate ? (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Available times for {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {timeSlots.map((time) => (
                  <TimeSlot
                    key={time}
                    time={time}
                    available={isTimeAvailable(selectedDate, time)}
                    suggested={isSuggestedTime(time)}
                    selected={selectedTime === time}
                    onClick={() => setSelectedTime(time)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CalendarIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Select a date to view available times
              </h3>
              <p className="text-muted-foreground">
                Choose from the calendar above to see time slots and AI suggestions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 flex flex-col">
        <AISchedulingSuggestions selectedDate={selectedDate} />
        <MeetingDetailsForm selectedDate={selectedDate} selectedTime={selectedTime} />
      </div>
    </div>
  );
};

export default ModernCalendarScheduler; 