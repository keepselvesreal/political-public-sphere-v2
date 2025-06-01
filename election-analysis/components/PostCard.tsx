import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

type Candidate = {
  name: string;
  percentage: number;
  color: string;
};

type PostCardProps = {
  id: string;
  predictedWinner: string;
  marginPercentage: number;
  mainQuote: string;
  candidates: Candidate[];
  tags: string[];
  analyst: {
    name: string;
    avatar: string;
    institute: string;
    date: string;
  };
};

export default function PostCard({ 
  id,
  predictedWinner,
  marginPercentage,
  mainQuote,
  candidates,
  tags,
  analyst
}: PostCardProps) {
  // Determine margin color based on percentage
  const getMarginColor = (percentage: number) => {
    if (percentage >= 10) return 'text-green-600';
    if (percentage >= 5) return 'text-green-500';
    return 'text-green-400';
  };
  
  const marginColor = getMarginColor(marginPercentage);
  
  return (
    <Link href={`/post/${id}`}>
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <span className="text-amber-500 mr-2">🏆</span>
              <span className="font-bold">PREDICTED WINNER</span>
            </div>
            <span className={`font-bold ${marginColor}`}>+{marginPercentage}%<span className="text-xs text-muted-foreground block text-right">margin</span></span>
          </div>
          
          <h3 className="text-xl font-bold mb-2">{predictedWinner}</h3>
          <p className="text-muted-foreground mb-6 text-sm italic">"{mainQuote}"</p>
          
          <div className="space-y-3 mb-6">
            {candidates.map((candidate, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{candidate.name}</span>
                  <span className="font-medium">{candidate.percentage}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${candidate.color}`} 
                    style={{ width: `${candidate.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="rounded-full text-xs px-2 py-1">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 dark:bg-gray-900 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={analyst.avatar} alt={analyst.name} />
              <AvatarFallback>{analyst.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{analyst.name}</p>
              <p className="text-xs text-muted-foreground">{analyst.institute} • {analyst.date}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardFooter>
      </Card>
    </Link>
  );
}