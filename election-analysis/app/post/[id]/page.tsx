import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import CommentSection from '@/components/CommentSection';
import VoteButtons from '@/components/VoteButtons';

// Mock data for the post details
const MOCK_POSTS = [
  {
    id: '1',
    title: 'Lee Jae-myung Projected to Win by +7% Margin',
    predictedWinner: 'Lee Jae-myung',
    marginPercentage: 7,
    mainQuote: 'Government judgment outweighed fear of criminals.',
    content: `
      <p>The latest polling data suggests that Lee Jae-myung is positioned to win the upcoming election with a significant margin of +7%. This projection is based on a comprehensive analysis of voter sentiment across different demographics and regions.</p>
      
      <h2>Key Findings</h2>
      <p>Our analysis indicates that Lee's campaign has successfully focused on economic policies that resonate with independent voters in their 30s. The approval rating shift observed in the past month demonstrates a growing confidence in Lee's leadership capabilities.</p>
      
      <h2>Demographic Breakdown</h2>
      <p>The support for Lee Jae-myung is particularly strong among urban voters and those with higher education. Meanwhile, Kim Moon-soo maintains strong support from traditional conservative bases but has failed to expand beyond these groups.</p>
      
      <h2>Regional Analysis</h2>
      <p>Lee's strongest support comes from Seoul and Gyeonggi Province, while Kim performs better in rural areas and parts of Gyeongsang Province. The gap between these regional preferences has narrowed compared to previous elections, indicating a potentially more unified electorate.</p>
      
      <h2>Policy Impact</h2>
      <p>The emphasis on judicial reform and economic growth has played a significant role in shifting public opinion. Concerns about criminal justice have been overshadowed by broader governance considerations, as reflected in our polling data.</p>
      
      <h2>Conclusion</h2>
      <p>While there are still several weeks until the election, current trends strongly favor Lee Jae-myung. Barring any major scandals or unexpected developments, we project a victory with a margin of approximately 7 percentage points.</p>
    `,
    candidates: [
      { name: 'Lee Jae-myung', percentage: 52, color: 'bg-blue-500' },
      { name: 'Kim Moon-soo', percentage: 41, color: 'bg-red-500' },
      { name: 'Lee Jun-seok', percentage: 9, color: 'bg-green-500' },
      { name: 'Kwon Young-guk', percentage: 9, color: 'bg-purple-500' },
    ],
    tags: ['30s independents', 'approval rating shift', 'economic policy', 'judicial reform'],
    analyst: {
      name: 'Dr. Kim Analysis',
      avatar: '/avatars/analyst1.jpg',
      institute: 'Political Research Center',
      date: 'Dec 15, 2024',
    },
    votes: { up: 342, down: 56 },
    comments: 24,
  },
  // Additional mock posts would be added here
];

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15에서는 params를 await로 처리해야 함
  const { id } = await params;
  
  // In a real app, this would fetch from an API
  const post = MOCK_POSTS.find(p => p.id === id);
  
  if (!post) {
    notFound();
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Link 
        href="/" 
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to all predictions
      </Link>
      
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-amber-500 text-xl">🏆</span>
            <span className="text-sm font-semibold bg-amber-100 dark:bg-amber-900 dark:text-amber-100 px-2 py-1 rounded">PREDICTED WINNER</span>
            <span className="text-green-600 font-bold">+{post.marginPercentage}% margin</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
          
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 mb-6">
            "{post.mainQuote}"
          </blockquote>
          
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="rounded-full">
                #{tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
            <Avatar className="h-10 w-10 mr-4">
              <AvatarImage src={post.analyst.avatar} alt={post.analyst.name} />
              <AvatarFallback>{post.analyst.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post.analyst.name}</p>
              <p className="text-sm text-muted-foreground">
                {post.analyst.institute} • {post.analyst.date}
              </p>
            </div>
          </div>
          
          <div className="space-y-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Vote Share Projection</h2>
            <div className="space-y-4">
              {post.candidates.map((candidate, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{candidate.name}</span>
                    <span className="font-medium">{candidate.percentage}%</span>
                  </div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${candidate.color}`} 
                      style={{ width: `${candidate.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div 
            className="prose dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          
          <VoteButtons 
            postId={post.id} 
            initialVotes={post.votes} 
          />
        </div>
      </div>
      
      <div className="mt-12">
        <CommentSection postId={post.id} />
      </div>
    </div>
  );
}