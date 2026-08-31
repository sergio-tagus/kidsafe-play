import { Heart, PlayCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { SafeVideo } from "@/lib/kids.functions";
import { youtubeThumb } from "@/lib/youtube";

export function VideoCard({ video, childId }: { video: SafeVideo; childId: string }) {
  const thumb = video.thumbnail_url || youtubeThumb(video.youtube_video_id);
  return (
    <Link
      to="/kids/$childId/watch/$videoId"
      params={{ childId, videoId: video.youtube_video_id } as any}
      className="group block rounded-2xl overflow-hidden bg-card shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        <img src={thumb} alt={video.title} loading="lazy" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-3">
        <div className="font-display font-semibold text-sm line-clamp-2 text-card-foreground">{video.title}</div>
        <div className="mt-1 text-xs text-muted-foreground truncate">{video.channel.channel_name}</div>
      </div>
    </Link>
  );
}

export function VideoRow({ title, videos, childId, scroll = false }: { title: string; videos: SafeVideo[]; childId: string; scroll?: boolean }) {
  if (!videos.length) return null;
  return (
    <section className="mb-8">
      <h2 className="text-xl md:text-2xl font-display font-bold mb-3 flex items-center gap-2">{title}</h2>
      {scroll ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {videos.map((v) => (
            <div key={v.id} className="w-44 sm:w-52 flex-shrink-0">
              <VideoCard video={v} childId={childId} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} childId={childId} />
          ))}
        </div>
      )}
    </section>
  );
}

export function FavoriteBadge({ favorited }: { favorited: boolean }) {
  return <Heart className={`w-5 h-5 ${favorited ? "fill-fun-pink text-fun-pink" : ""}`} />;
}
