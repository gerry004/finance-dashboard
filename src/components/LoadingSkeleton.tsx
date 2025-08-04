interface LoadingSkeletonProps {
  type?: 'dashboard' | 'table' | 'chart';
}

export function LoadingSkeleton({ type = 'dashboard' }: LoadingSkeletonProps) {
  if (type === 'dashboard') {
    return (
      <main className="container mx-auto py-10">
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse w-1/3"></div>
          
          {/* Monthly Overview skeleton */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* Metrics cards skeleton */}
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 bg-gray-100 rounded-lg">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            
            {/* Charts skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-4 bg-white rounded-lg shadow">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Financial Overview skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
            
            {/* Metrics cards skeleton */}
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 bg-gray-100 rounded-lg">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            
            {/* Charts skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-4 bg-white rounded-lg shadow">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Table skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
            <div className="overflow-x-auto rounded-lg">
              <div className="w-full">
                {/* Table header skeleton */}
                <div className="bg-gray-100">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex-1 p-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Table rows skeleton */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex border-b">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="flex-1 p-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
        <div className="overflow-x-auto rounded-lg">
          <div className="w-full">
            {/* Table header skeleton */}
            <div className="bg-gray-100">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-1 p-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Table rows skeleton */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex border-b">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex-1 p-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
} 