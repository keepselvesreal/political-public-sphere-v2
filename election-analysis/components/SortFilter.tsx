"use client";

import { useState } from 'react';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { SortAsc } from 'lucide-react';

export default function SortFilter() {
  const [sortOption, setSortOption] = useState('latest');
  
  const handleSortChange = (value: string) => {
    setSortOption(value);
    // In a real app, this would trigger a re-fetch of data with the new sort parameter
  };
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">정렬 기준</span>
      <Select value={sortOption} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Sort options</SelectLabel>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="margin">Highest Margin</SelectItem>
            <SelectItem value="comments">Most Comments</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}