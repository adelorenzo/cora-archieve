export const PersonaSelectorSkeleton = () => (
  <div className="w-32 h-9 bg-muted animate-pulse rounded" />
);

export const ModelSelectorSkeleton = () => (
  <div className="w-48 h-9 bg-muted animate-pulse rounded" />
);

export const ThemeSwitcherSkeleton = () => (
  <div className="w-32 h-9 bg-muted animate-pulse rounded" />
);

export const MessageSkeleton = () => (
  <div className="flex gap-2 p-4">
    <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
      <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
    </div>
  </div>
);

export const ChatSkeleton = () => (
  <div className="flex-1 overflow-hidden flex flex-col">
    {/* Messages area */}
    <div className="flex-1 space-y-4 p-4">
      <MessageSkeleton />
      <MessageSkeleton />
      <MessageSkeleton />
    </div>

    {/* Input area */}
    <div className="border-t p-4">
      <div className="h-24 bg-muted animate-pulse rounded" />
      <div className="flex gap-2 mt-2">
        <div className="w-20 h-9 bg-muted animate-pulse rounded" />
        <div className="w-20 h-9 bg-muted animate-pulse rounded" />
      </div>
    </div>
  </div>
);