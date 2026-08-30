import { Heart, PlayCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { SafeVideo } from "@/lib/kids.functions";
import { youtubeThumb } from "@/lib/youtube";

export function VideoCard({ video, childId }: { video: SafeVideo; childId: string }) {
  const thumb = video.thumbnail_url || youtubeThumb(video.youtube_video_id);
  return (
    <Link
      to="/kids/$childId/watch/$videoId"
      params={{ childId, videoId: video.youtube_video_id }}
      className="group block rounded-2xl overflow-hidden bg-card shadow-md transition-all hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        <img
          src={thumb}
          alt={video.title}
          loading="lazy"
          decoding="async"
          width={480}
          height={270}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <PlayCircle
            className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="p-3">
        <div className="font-display font-semibold text-sm line-clamp-2 text-card-foreground">{video.title}</div>
        <div className="mt-1 text-xs text-muted-foreground truncate">{video.channel.channel_name}</div>
      </div>
    </Link>
  );
}

export function VideoRow({ title, videos, childId }: { title: string; videos: SafeVideo[]; childId: string }) {
  if (!videos.length) return null;
  return (
    <section className="mb-8">
      <h2 className="text-xl md:text-2xl font-display font-bold mb-3 flex items-center gap-2">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} childId={childId} />
        ))}
      </div>
    </section>
  );
}

/** Skeleton grid used while a catalogue row is loading. */
export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video rounded-2xl bg-muted" />
          <div className="mt-2 h-4 w-4/5 rounded-full bg-muted" />
          <div className="mt-1 h-3 w-1/2 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function FavoriteBadge({ favorited }: { favorited: boolean }) {
  return <Heart className={`w-5 h-5 ${favorited ? "fill-fun-pink text-fun-pink" : ""}`} aria-hidden="true" />;
}
