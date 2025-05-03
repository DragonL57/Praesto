'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Typewriter from '@/components/ui/typewriter';

export const Greeting = () => {
  const [greeting, setGreeting] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only execute client-side code after component has mounted
    setMounted(true);
    
    // Function to get user's first name from email
    const getUserFirstName = (email: string | null | undefined) => {
      if (!email) return '';
      // Try to get name part before @ symbol
      const namePart = email.split('@')[0];
      // Remove numbers and special chars, capitalize first letter
      const cleanName = namePart.replace(/[^a-zA-Z]/g, '');
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
    };

    // Get email from localStorage if available
    const email = localStorage.getItem("unitaskai_remembered_email") || undefined;
    const userName = getUserFirstName(email);
    
    // Generate the greeting - all time/date logic only runs client-side
    const now = new Date();
    const hours = now.getHours();
    const dayOfWeek = now.getDay();
    const date = now.getDate();
    const month = now.getMonth();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Create arrays of diverse greetings for different times of day
    const earlyMorningGreetings = [
      "You're up early",
      "Burning the midnight oil",
      "Working late tonight",
      "Night owl session",
      "Quiet hours productivity"
    ];
    
    const morningGreetings = [
      "Good morning",
      "Rise and shine",
      "Morning",
      "Hello bright and early",
      "Top of the morning"
    ];
    
    const afternoonGreetings = [
      "Good afternoon",
      "Afternoon",
      "Having a productive day",
      "Midday greetings",
      "Hope your day is going well"
    ];
    
    const eveningGreetings = [
      "Good evening",
      "Evening",
      "Winding down the day",
      "Evening greetings",
      "Hope you had a good day"
    ];
    
    // Special dates/occasions
    const isNewYear = month === 0 && date <= 5;
    const isChristmas = month === 11 && (date >= 24 && date <= 26);
    const isHalloween = month === 9 && date === 31;
    const isThanksgiving = month === 10 && dayOfWeek === 4 && date >= 22 && date <= 28;
    // May 4th - Star Wars Day
    const isStarWarsDay = month === 4 && date === 4;
    
    // Use a deterministic approach - no randomness
    const getGreeting = (greetings: string[]) => {
      // Use day of month to select greeting instead of minutes
      // This ensures same greeting for the whole day
      const index = date % greetings.length;
      return greetings[index];
    };
    
    // Generate the base greeting based on time of day
    let baseGreeting = '';
    
    // Early morning (midnight to 4:59 AM)
    if (hours >= 0 && hours < 5) {
      baseGreeting = getGreeting(earlyMorningGreetings);
    }
    // Morning (5 AM to 11:59 AM)
    else if (hours < 12) {
      baseGreeting = getGreeting(morningGreetings);
      
      // Add weekend variant if it's a weekend
      if (isWeekend) {
        baseGreeting = hours < 9 ? 
          `${baseGreeting}, weekend early bird` : 
          `Happy weekend ${baseGreeting.toLowerCase()}`;
      }
    }
    // Afternoon (12 PM to 4:59 PM)
    else if (hours < 17) {
      baseGreeting = getGreeting(afternoonGreetings);
      
      // Add weekend variant for weekends
      if (isWeekend) {
        baseGreeting = `Weekend ${baseGreeting.toLowerCase()}`;
      }
    }
    // Evening (5 PM onwards)
    else {
      baseGreeting = getGreeting(eveningGreetings);
      
      // Add weekend variant for weekend evenings
      if (isWeekend) {
        baseGreeting = `Weekend ${baseGreeting.toLowerCase()}`;
      }
    }
    
    // Override with special occasion greetings if applicable
    if (isNewYear) {
      baseGreeting = "Happy New Year";
    } else if (isChristmas) {
      baseGreeting = "Merry Christmas";
    } else if (isHalloween) {
      baseGreeting = "Happy Halloween";
    } else if (isThanksgiving) {
      baseGreeting = "Happy Thanksgiving";
    } else if (isStarWarsDay) {
      baseGreeting = "May the 4th be with you";
    }
    
    // Add personalization with the user's name if available
    // Use day of month to determine format - even day puts name at end, odd day puts name at beginning
    if (userName) {
      if (date % 2 === 0) {
        setGreeting(`${baseGreeting}, ${userName}`);
      } else {
        setGreeting(`${userName}, ${baseGreeting.toLowerCase()}`);
      }
    } else {
      setGreeting(baseGreeting);
    }
    
  }, []);
  
  // During server-side rendering, return a simple placeholder
  // Once mounted on client, show the actual greeting
  if (!mounted) {
    return (
      <div className="text-center mb-4">
        <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          Welcome
        </div>
      </div>
    );
  }
  
  return (
    <div className="text-center mb-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl font-extrabold"
      >
        <Typewriter 
          text={greeting}
          speed={40}
          initialDelay={300}
          showCursor={true}
          cursorClassName="text-indigo-500 ml-1 font-normal"
          cursorChar="▌"
          className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        />
      </motion.div>
    </div>
  );
};