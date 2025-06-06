import ExperimentalPostRenderer from '@/components/community-posts/experimental-post-renderer';


async function getPostData() {
  // 정적 JSON 파일에서 데이터 로드
  return samplePostData;
}

export default async function ExperimentPostDetailsPage() {
  const postData = await getPostData();

  if (!postData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            게시글 데이터를 찾을 수 없습니다
          </h1>
          <p className="text-gray-600 mb-6">
            먼저 스크래퍼를 실행하여 게시글 데이터를 생성해주세요.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg text-left max-w-2xl mx-auto">
            <p className="font-mono text-sm">
              python fmkorea_scraper.py https://www.fmkorea.com/8485393463
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            에펨코리아 게시글 재현 실험
          </h1>
          <p className="text-gray-600">
            스크래핑된 데이터를 바탕으로 원본 게시글을 재현합니다
          </p>
        </div>
        
        <ExperimentalPostRenderer postData={postData} />
      </div>
    </div>
  );
}

export const metadata = {
  title: '에펨코리아 게시글 재현 실험',
  description: '스크래핑된 데이터를 바탕으로 원본 게시글을 재현하는 실험 페이지',
}; 