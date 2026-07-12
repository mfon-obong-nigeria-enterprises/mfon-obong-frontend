// src/components/SearchAndFilter.tsx
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Search, MapPin, Users, CalendarDays, Zap } from "lucide-react";

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filterName: string, value: string) => void;
  roles?: string[];
  locations?: string[];
  showLocationFilter?: boolean;
}

const UserSearchList: React.FC<SearchAndFilterProps> = ({
  onSearch,
  onFilterChange,
  roles = [],
  locations = [],
  //showLocationFilter = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (filterName: string, value: string) => {
    switch (filterName) {
      case "role":
        setSelectedRole(value);
        break;
      case "location":
        setSelectedLocation(value);
        break;
      case "dateRange":
        setSelectedDateRange(value);
        break;
      case "status":
        setSelectedStatus(value);
        break;
      default:
        break;
    }
    onFilterChange(filterName, value);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-3 px-4 py-5 font-sans w-full overflow-x-auto">
      {/* Search Input */}
      <div className="relative w-full lg:flex-1">
        <span className="absolute left-3 inset-y-0 my-auto flex items-center text-muted-foreground">
          <Search className="size-5" />
        </span>
        <Input
          type="text"
          placeholder="Search activities..."
          className="pl-10 pr-4 py-5 rounded-lg border border-[#E0E0E0] w-full text-sm bg-white! text-[#444] placeholder:text-[#B0B0B0]"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-nowrap gap-2 items-center justify-start overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Role Filter */}
        <Select
          value={selectedRole}
          onValueChange={(value) => handleFilterChange("role", value)}
        >
          <SelectTrigger className="flex items-center gap-2 py-5 px-2 rounded-lg border border-[#E0E0E0] bg-white! text-[#444] text-sm font-medium w-[145px] flex-shrink-0">
            <Users className="size-4 text-muted-foreground" />
            <span className="truncate">
              {selectedRole === "all" ? "All Roles" : selectedRole}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Location Filter */}
        <Select
          value={selectedLocation}
          onValueChange={(value) => handleFilterChange("location", value)}
        >
          <SelectTrigger className="flex items-center gap-2 py-5 px-2 rounded-lg border border-[#E0E0E0] bg-white! text-[#444] text-sm font-medium w-[160px] flex-shrink-0">
            <MapPin className="size-4 text-muted-foreground" />
            <span className="truncate">
              {selectedLocation === "all" ? "All Locations" : selectedLocation}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select
          value={selectedDateRange}
          onValueChange={(value) => handleFilterChange("dateRange", value)}
        >
          <SelectTrigger className="flex items-center gap-2 py-5 px-2 rounded-lg border border-[#E0E0E0] bg-white! text-[#444] text-sm font-medium w-[145px] flex-shrink-0">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="truncate">
              {selectedDateRange === "all"
                ? "Date Range"
                : selectedDateRange === "custom"
                ? "Custom Range"
                : selectedDateRange}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={selectedStatus}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger className="flex items-center gap-2 py-5 px-2 rounded-lg border border-[#E0E0E0] bg-white! text-[#444] text-sm font-medium w-[145px] flex-shrink-0">
            <Zap className="size-4 text-muted-foreground fill-[#7D7D7D]" />
            <span className="truncate">
              {selectedStatus === "all" ? "All Status" : selectedStatus}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default UserSearchList;
