"use client";

import { memo, useEffect, useRef } from "react";
import { ArrowRight, X, Loader2 } from "lucide-react";
import type { Article } from "../../lib/types";

interface Comment {
  id?: number;
  user_name?: string;
  guest_name?: string;
  body: string;
}

interface ArticleCommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  comments: Comment[];
  isLoading?: boolean;
  commentText: string;
  commentBusy: boolean;
  user: { name?: string; email?: string } | null;
  onCommentChange: (text: string) => void;
  onCommentSubmit: () => void;
  onShareComment: (id: number, text: string) => void;
  onOpenAuth: () => void;
}

const MAX_COMMENT_LENGTH = 1000;

function ArticleCommentDrawerInner({
  isOpen,
  onClose,
  article,
  comments,
  isLoading = false,
  commentText,
  commentBusy,
  user,
  onCommentChange,
  onCommentSubmit,
  onShareComment,
  onOpenAuth,
}: ArticleCommentDrawerProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Trap focus and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const charsLeft = MAX_COMMENT_LENGTH - commentText.length;
  const isOverLimit = charsLeft < 0;

  return (
    <div
      className="article-comments-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Comments"
    >
      <aside className="article-comments-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="article-comments-header">
          <button type="button" onClick={onClose} aria-label="Close comments">
            <X size={22} />
          </button>
          <strong>COMMENTS</strong>
        </div>

        <div className="article-comments-story">{article.title}</div>

        <div className="article-comments-tabs">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--subtext))" }}>
              <Loader2 size={13} className="animate-spin" aria-hidden />
              Loading comments…
            </span>
          ) : (
            <span>All Comments ({comments.length})</span>
          )}
        </div>

        <div className="article-comments-list" ref={listRef}>
          {isLoading ? (
            <div className="article-comment-empty">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 opacity-40" aria-hidden />
              <span>Loading…</span>
            </div>
          ) : comments.length > 0 ? (
            comments.map((c, i) => (
              <article key={c.id ?? i} className="article-comment-card">
                <div className="article-comment-avatar" aria-hidden="true">
                  {(c.user_name || c.guest_name || "R").charAt(0).toUpperCase()}
                </div>
                <div className="article-comment-body">
                  <div className="article-comment-name">
                    {c.user_name || c.guest_name || "Reader"}
                  </div>
                  <p>{c.body}</p>
                  <div className="article-comment-actions">
                    <button
                      type="button"
                      onClick={() => onShareComment(c.id ?? i, c.body)}
                      aria-label="Share this comment"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="article-comment-empty">
              Be the first to comment on this story.
            </div>
          )}
        </div>

        <div className="article-comments-compose">
          {user ? (
            <>
              <textarea
                value={commentText}
                onChange={(e) => onCommentChange(e.target.value.slice(0, MAX_COMMENT_LENGTH + 50))}
                placeholder="Write your comment here…"
                rows={2}
                aria-label="Comment text"
                aria-describedby="comment-chars-left"
                style={isOverLimit ? { borderColor: "hsl(var(--destructive))" } : undefined}
              />
              <div
                id="comment-chars-left"
                style={{
                  fontSize: "11px",
                  textAlign: "right",
                  marginTop: "2px",
                  color: isOverLimit ? "hsl(var(--destructive))" : "hsl(var(--subtext))",
                }}
              >
                {isOverLimit ? `${Math.abs(charsLeft)} over limit` : `${charsLeft} left`}
              </div>
              <button
                type="button"
                onClick={onCommentSubmit}
                disabled={commentBusy || !commentText.trim() || isOverLimit}
                aria-label="Submit comment"
              >
                {commentBusy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <ArrowRight size={20} />}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="article-comments-signin"
              onClick={onOpenAuth}
            >
              Sign in to comment
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

const ArticleCommentDrawer = memo(ArticleCommentDrawerInner);
export default ArticleCommentDrawer;
