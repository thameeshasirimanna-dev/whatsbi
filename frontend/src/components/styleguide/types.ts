import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export interface MetricCardData {
  id: string;
  title: string;
  filter: string;
  value?: string | number;
  unit?: string;
  badge?: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  instructions: string;
  category?: string;
}

export interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  status: 'available' | 'booked' | 'unavailable';
}

export interface TimeSlot {
  id: string;
  label: string;
  available: boolean;
}

export interface AgentProfile {
  name: string;
  specialty: string;
  avatar: string;
  experience: string;
  totalMessages: string;
  rating: string;
  reviewsCount: number;
}
