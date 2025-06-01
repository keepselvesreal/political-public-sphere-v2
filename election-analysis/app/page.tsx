import SortFilter from '@/components/SortFilter';
import PostCardGrid from '@/components/PostCardGrid';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Election Analysis Hub</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Compare expert predictions and analysis from leading political analysts. Click
          any card to dive deeper into the full analysis.
        </p>
        
        <Button 
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-6 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <span className="mr-2">나도 분석해보기</span>
          <ChevronRight size={16} />
        </Button>
      </div>
      
      <div className="flex justify-end mb-4">
        <SortFilter />
      </div>
      
      <PostCardGrid />
    </div>
  );
}