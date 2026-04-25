"use client";

import type { Provider } from "@/lib/providers";

interface MarqueeProps {
  providers: Provider[];
}

export default function Marquee({
  providers,
}: MarqueeProps): React.ReactElement {
  const doubled = [...providers, ...providers];

  return (
    <div className="marquee-container w-full pt-8 pb-4 relative mt-4 md:mt-12">
      <div className="marquee-content px-4" aria-hidden="true">
        {doubled.map((provider, index) => (
          <div
            key={`${provider.id}-${index}`}
            className="flex items-center gap-3 text-gray-500 font-medium hover:text-white transition-colors cursor-default whitespace-nowrap"
          >
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: provider.icon }}
            />
            <span className="text-base">{provider.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
