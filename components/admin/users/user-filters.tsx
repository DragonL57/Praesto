'use client';

import { Button } from '@/components/ui/button';
import { CalendarIcon, FilterX } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';

export function UserFilters() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [role, setRole] = useState<string>();

  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setRole(undefined);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="guest">Guest</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[200px] justify-start text-left font-normal',
              !dateFrom && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {dateFrom ? format(dateFrom, 'PPP') : 'Registered from'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateFrom}
            onSelect={setDateFrom}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[200px] justify-start text-left font-normal',
              !dateTo && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {dateTo ? format(dateTo, 'PPP') : 'Registered to'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateTo}
            onSelect={setDateTo}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {(dateFrom || dateTo || role) && (
        <Button variant="ghost" onClick={resetFilters}>
          <FilterX className="mr-2 size-4" />
          Reset Filters
        </Button>
      )}
    </div>
  );
}
