"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ModeToggle } from '@/components/ModeToggle';
import { BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-white dark:bg-gray-950 shadow-md py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <BarChart2 className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl">ElectionPulse</span>
        </Link>
        
        <div className="flex items-center space-x-8">
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/predictions" 
              className="text-foreground hover:text-blue-600 transition-colors"
            >
              Predictions
            </Link>
            <Link 
              href="/analysis" 
              className="text-foreground hover:text-blue-600 transition-colors"
            >
              Analysis
            </Link>
            <Link 
              href="/trends" 
              className="text-foreground hover:text-blue-600 transition-colors"
            >
              Trends
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">Sign In</Button>
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}