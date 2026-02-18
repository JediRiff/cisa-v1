'use client'

export default function SkeletonLoader() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Hero Section Skeleton */}
      <section className="hero-bg-pattern relative py-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          {/* Logo placeholder */}
          <div className="flex justify-center mb-10">
            <div className="h-16 md:h-20 w-80 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          </div>

          {/* Title skeleton */}
          <div className="text-center mb-10">
            <div className="h-20 md:h-24 w-64 bg-gray-200 dark:bg-slate-700 rounded-lg mx-auto mb-6" />
            <div className="h-6 w-96 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
          </div>

          {/* Score display skeleton */}
          <div className="flex flex-col items-center gap-6 mb-12">
            <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl bg-gray-300 dark:bg-slate-600" />
            <div className="text-center space-y-3">
              <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
              <div className="h-7 w-24 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
            </div>
          </div>

          {/* Action buttons skeleton */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="h-14 w-44 bg-gray-200 dark:bg-slate-700 rounded-xl" />
            <div className="h-14 w-40 bg-gray-300 dark:bg-slate-600 rounded-xl" />
          </div>
        </div>
      </section>

      {/* Key Metrics Skeleton */}
      <section className="py-8 px-4 bg-cisa-light dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-cisa-navy dark:bg-slate-800 rounded-2xl p-6 h-32">
                <div className="h-4 w-24 bg-white/20 rounded mb-3" />
                <div className="h-10 w-20 bg-white/30 rounded mb-2" />
                <div className="h-4 w-32 bg-white/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Score Breakdown Skeleton */}
      <section className="py-12 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="card-premium-trump p-8">
            <div className="h-8 w-64 bg-gray-200 dark:bg-slate-700 rounded mb-6" />
            <div className="h-4 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-full mb-8" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full" />
                    <div>
                      <div className="h-5 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-4 w-24 bg-gray-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-red-100 dark:bg-red-900/30 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sources Bar Skeleton */}
      <section className="py-8 px-4 bg-cisa-light dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="card-premium-trump p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl" />
              <div className="h-8 w-40 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-6 w-48 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </section>

      {/* Threat Feeds Skeleton */}
      <section className="py-12 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Energy column */}
            <div className="card-premium-trump p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl" />
                <div className="h-7 w-48 bg-gray-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 border border-gray-100 dark:border-slate-700 rounded-xl">
                    <div className="h-5 w-full bg-gray-200 dark:bg-slate-700 rounded mb-3" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full" />
                      <div className="h-6 w-20 bg-gray-100 dark:bg-slate-800 rounded-full" />
                      <div className="h-6 w-24 bg-gray-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All threats column */}
            <div className="card-premium-trump p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl" />
                <div className="h-7 w-44 bg-gray-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 border border-gray-100 dark:border-slate-700 rounded-xl">
                    <div className="h-5 w-full bg-gray-200 dark:bg-slate-700 rounded mb-3" />
                    <div className="flex gap-2">
                      <div className="h-6 w-20 bg-purple-100 dark:bg-purple-900/30 rounded-full" />
                      <div className="h-6 w-16 bg-gray-100 dark:bg-slate-800 rounded-full" />
                      <div className="h-6 w-20 bg-gray-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
