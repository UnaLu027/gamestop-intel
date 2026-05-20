import React from 'react'
import { MessageCircle, ThumbsUp, Reddit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { PostItem } from '../api/client'
import clsx from 'clsx'

interface PostCardProps {
  post: PostItem
}

const STANCE_STYLES: Record<string, string> = {
  bullish: 'bg-green-900/30 text-green-400 border-green-700/40',
  bearish: 'bg-red-900/30 text-red-400 border-red-700/40',
  neutral: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
}

const STANCE_LABELS: Record<string, string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral',
}

const POST_TYPE_LABELS: Record<string, string> = {
  opinion: 'Opinion',
  coordination: 'Coordination',
  meme: 'Meme',
  news: 'News',
}

const POST_TYPE_STYLES: Record<string, string> = {
  opinion: 'text-slate-400',
  coordination: 'text-orange-400',
  meme: 'text-purple-400',
  news: 'text-blue-400',
}

const AUTHOR_TYPE_STYLES: Record<string, string> = {
  influencer: 'text-yellow-400',
  retail: 'text-slate-400',
  news_outlet: 'text-blue-400',
}

function platformIcon(platform: string) {
  if (platform === 'reddit') return <span className="text-orange-400 text-xs font-bold">r/</span>
  if (platform === 'news') return <span className="text-blue-400 text-xs font-bold">N</span>
  return <span className="text-slate-400 text-xs">?</span>
}

export default function PostCard({ post }: PostCardProps) {
  const stanceStyle = STANCE_STYLES[post.stance] ?? STANCE_STYLES.neutral
  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(post.post_time), { addSuffix: true })
    } catch {
      return post.post_time.slice(0, 10)
    }
  })()

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-colors duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
            {platformIcon(post.platform)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  'text-sm font-medium truncate',
                  AUTHOR_TYPE_STYLES[post.author_type] ?? 'text-slate-300'
                )}
              >
                {post.author_id ?? 'anonymous'}
              </span>
              {post.author_type === 'influencer' && (
                <span className="text-yellow-400 text-xs bg-yellow-900/30 border border-yellow-700/40 px-1.5 py-0.5 rounded-full">
                  Influencer
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">{timeAgo}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={clsx('text-xs px-2 py-0.5 rounded-full border', stanceStyle)}>
            {STANCE_LABELS[post.stance] ?? post.stance}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-slate-300 text-sm leading-relaxed line-clamp-3 mb-3">
        {post.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <ThumbsUp size={12} />
            {post.likes.toLocaleString()}
          </span>
          <span
            className={clsx(
              'font-medium',
              POST_TYPE_STYLES[post.post_type] ?? 'text-slate-400'
            )}
          >
            {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Hype:</span>
          <span
            className={clsx(
              'font-semibold',
              post.hype_score > 0.7 ? 'text-red-400' :
              post.hype_score > 0.4 ? 'text-yellow-400' :
              'text-green-400'
            )}
          >
            {(post.hype_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
}
