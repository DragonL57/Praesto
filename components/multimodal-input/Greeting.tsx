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
    
    // Use a deterministic approach - no randomness
    const getGreeting = (greetings: string[]) => {
      // Use day of month to select greeting instead of minutes
      // This ensures same greeting for the whole day
      const date = now.getDate();
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
      
      // Add weekend variant if it's a weekend - in a more natural way
      if (isWeekend) {
        baseGreeting = hours < 9 ? 
          `${baseGreeting} on this weekend` : 
          `${baseGreeting} and happy weekend`;
      }
    }
    // Afternoon (12 PM to 4:59 PM)
    else if (hours < 17) {
      baseGreeting = getGreeting(afternoonGreetings);
      
      // Add weekend variant for weekends - in a more natural way
      if (isWeekend) {
        baseGreeting = `${baseGreeting} and happy weekend`;
      }
    }
    // Evening (5 PM onwards)
    else {
      baseGreeting = getGreeting(eveningGreetings);
      
      // Add weekend variant for weekend evenings - in a more natural way
      if (isWeekend) {
        baseGreeting = `${baseGreeting} and happy weekend`;
      }
    }
    
    // Add personalization with the user's name if available
    const date = now.getDate();
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
        <div className="text-2xl font-extrabold">
          Welcome
        </div>
      </div>
    );
  }
  
  return (
    <div className="text-center mb-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-2xl font-normal"
      >
        <Typewriter 
          text={greeting}
          speed={70}
          initialDelay={300}
          loop={false}
          showCursor={true}
          cursorChar="_"
          cursorClassName="ml-1"
          className="text-foreground dark:text-foreground"
        />
      </motion.div>
    </div>
  );
};