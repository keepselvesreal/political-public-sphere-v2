/*
목차:
- 개별 커뮤니티 게시글 조회 API (라인 1-30)
- GET: 특정 post_id로 에펨코리아 게시글 조회 (라인 31-80)
- 원본 데이터 구조 반환 (라인 81-120)
*/

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// MongoDB 연결 함수 (political_public_sphere 데이터베이스)
async function connectDB() {
  try {
    // 이미 연결되어 있으면 그대로 사용
    if (mongoose.connections[0].readyState === 1) {
      return mongoose.connections[0].db;
    }
    
    // 연결 중이면 완료될 때까지 기다림
    if (mongoose.connections[0].readyState === 2) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
      return mongoose.connections[0].db;
    }
    
    // 새로 연결
    await mongoose.connect('mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/political_public_sphere');
    console.log('✅ MongoDB political_public_sphere 연결 성공');
    
    return mongoose.connections[0].db;
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    throw error;
  }
}

// GET /api/community-posts/[id] - 특정 게시글 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await connectDB();
    if (!db) {
      throw new Error('데이터베이스 연결이 설정되지 않았습니다.');
    }

    const { id: postId } = await params;
    console.log('조회할 게시글 ID:', postId);

    // 직접 MongoDB 컬렉션에서 데이터 조회 (community_posts 컬렉션 사용)
    const collection = db.collection('community_posts');
    
    // post_id로 검색 (새로운 CommunityPost 모델)
    let post = await collection.findOne({ post_id: postId });
    console.log('post_id로 검색:', postId);
    
    // post_id로 찾지 못한 경우 ObjectId로도 시도
    if (!post) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
      if (isObjectId) {
        const { ObjectId } = require('mongodb');
        post = await collection.findOne({ _id: new ObjectId(postId) });
        console.log('ObjectId로 검색:', postId);
      }
    }

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: '게시글을 찾을 수 없습니다.',
          searched_id: postId,
          search_type: 'post_id'
        },
        { status: 404 }
      );
    }

    console.log('게시글 발견:', post.metadata?.title || post.post_id);

    // Atlas 데이터를 실험용 컴포넌트 형태로 변환 (통일된 구조)
    const transformedContent = (post.content || []).map((item: any) => {
      switch (item.type) {
        case 'text':
          return {
            type: 'text',
            order: item.order || 0,
            data: {
              // 통일된 중첩 구조 사용
              text: item.data?.text || '',
              innerHTML: item.data?.innerHTML || '',
              tag: item.data?.tag || 'div',
              style: item.data?.style || '',
              class: item.data?.class || '',
              id: item.data?.id || ''
            }
          };
        case 'image':
          return {
            type: 'image',
            order: item.order || 0,
            data: {
              // 통일된 중첩 구조 사용
              src: item.data?.src || '',
              alt: item.data?.alt || '',
              width: item.data?.width || '',
              height: item.data?.height || '',
              href: item.data?.href || '',
              data_original: item.data?.data_original || item.data?.src || '',
              original_src: item.data?.original_src || item.data?.src || '',
              style: item.data?.style || '',
              class: item.data?.class || '',
              title: item.data?.title || '',
              link_class: item.data?.link_class || '',
              link_rel: item.data?.link_rel || ''
            }
          };
        case 'video':
          return {
            type: 'video',
            order: item.order || 0,
            data: {
              // 통일된 중첩 구조 사용
              src: item.data?.src || '',
              poster: item.data?.poster || '',
              autoplay: item.data?.autoplay || false,
              loop: item.data?.loop || false,
              muted: item.data?.muted !== false,
              controls: item.data?.controls !== false,
              preload: item.data?.preload || 'metadata',
              width: item.data?.width || '',
              height: item.data?.height || '',
              class: item.data?.class || ''
            }
          };
        case 'iframe':
          return {
            type: 'iframe',
            order: item.order || 0,
            data: {
              // 통일된 중첩 구조 사용
              src: item.data?.src || '',
              width: item.data?.width || '',
              height: item.data?.height || '',
              class: item.data?.class || ''
            }
          };
        default:
          return {
            type: 'text',
            order: item.order || 0,
            data: {
              text: JSON.stringify(item),
              tag: 'div'
            }
          };
      }
    });

    // 댓글도 실험용 컴포넌트 형태로 변환 (통일된 구조)
    const transformedComments = (post.comments || []).map((comment: any, index: number) => ({
      comment_id: comment.comment_id || comment.id || `comment_${index}`,
      author: comment.author || '익명',
      content: comment.content || '',
      date: comment.date || comment.created_at || '',
      level: comment.level || comment.depth || 0,
      is_reply: comment.is_reply || false,
      parent_comment: comment.parent_comment || comment.parent_id || '',
      vote_count: comment.like_count || comment.vote_count || 0,
      blame_count: comment.dislike_count || comment.blame_count || 0,
      is_best: comment.is_best || false,
      is_author: comment.is_author || false,
      // 루리웹 댓글 이미지 지원
      image_url: comment.images && comment.images.length > 0 ? comment.images[0] : (comment.image_url || ''),
      image_link: comment.image_link || '',
      video_url: comment.video_url || '',
      video_autoplay: comment.video_autoplay || false,
      video_loop: comment.video_loop || false,
      video_muted: comment.video_muted !== false
    }));

    // 원본 데이터 구조 그대로 반환 (실험용 컴포넌트에서 사용)
    const response = {
      success: true,
      data: {
        // 기본 정보
        post_id: post.post_id,
        post_url: post.post_url,
        scraped_at: post.scraped_at,
        created_at: post.created_at,
        updated_at: post.updated_at,
        
        // 메타데이터
        metadata: {
          title: post.metadata?.title || extractTitle(post.content),
          author: post.metadata?.author || '익명',
          date: post.metadata?.date || post.created_at,
          category: '정치',
          view_count: post.metadata?.view_count || generateMetric(post.post_id, 100, 2000),
          like_count: post.metadata?.like_count || generateMetric(post.post_id + '1', 10, 300),
          dislike_count: post.metadata?.dislike_count || 0,  // 실제 데이터 우선 사용
          comment_count: post.comments?.length || post.metadata?.comment_count || 0
        },
        
        // 변환된 콘텐츠 구조
        content: transformedContent,
        
        // 변환된 댓글 구조
        comments: transformedComments,
        
        // 실험 목적
        experiment_purpose: "FM코리아 게시글 원본 재현"
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('개별 게시글 조회 실패:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '게시글을 불러오는데 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 콘텐츠에서 제목 추출
function extractTitle(content: any[]): string {
  if (!content || content.length === 0) return '제목 없음';
  
  // 첫 번째 텍스트 콘텐츠에서 제목 추출
  const firstTextContent = content.find(item => 
    item.type === 'text' && (item.data?.text || item.content)
  );
  
  if (firstTextContent) {
    const text = firstTextContent.data?.text || firstTextContent.content || '';
    const title = text.substring(0, 100);
    return title || '제목 없음';
  }
  
  return '제목 없음';
}

// post_id 기반 일관된 메트릭 생성
function generateMetric(seed: string, min: number, max: number): number {
  const numericSeed = parseInt(seed.slice(-6)) || 123456;
  const x = Math.sin(numericSeed) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
} 