import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <FileQuestion className="h-20 w-20 text-muted-foreground mb-6" />
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto">
        The analysis you're looking for doesn't exist or has been removed.
      </p>
      <Button asChild>
        <Link href="/">
          Return to Homepage
        </Link>
      </Button>
    </div>
  );
}