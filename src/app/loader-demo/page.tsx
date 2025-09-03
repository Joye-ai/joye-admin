"use client";

import { Card, CardHeader, CardTitle, CardContent, Loader } from "@/components/ui";

export default function LoaderDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Loader Component Demo</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Spinner Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Spinner Loaders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Sizes</h3>
                <div className="flex items-center space-x-4">
                  <Loader size="sm" variant="primary" />
                  <Loader size="md" variant="primary" />
                  <Loader size="lg" variant="primary" />
                  <Loader size="xl" variant="primary" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Variants</h3>
                <div className="flex items-center space-x-4">
                  <Loader variant="primary" />
                  <Loader variant="secondary" />
                  <Loader variant="gray" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">With Text</h3>
                <Loader variant="primary" text="Loading..." />
              </div>
            </CardContent>
          </Card>

          {/* Dots Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Dots Loaders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Sizes</h3>
                <div className="flex items-center space-x-4">
                  <Loader type="dots" size="sm" variant="primary" />
                  <Loader type="dots" size="md" variant="primary" />
                  <Loader type="dots" size="lg" variant="primary" />
                  <Loader type="dots" size="xl" variant="primary" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Variants</h3>
                <div className="flex items-center space-x-4">
                  <Loader type="dots" variant="primary" />
                  <Loader type="dots" variant="secondary" />
                  <Loader type="dots" variant="gray" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">With Text</h3>
                <Loader type="dots" variant="primary" text="Processing..." />
              </div>
            </CardContent>
          </Card>

          {/* Bars Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Bars Loaders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Sizes</h3>
                <div className="flex items-center space-x-4">
                  <Loader type="bars" size="sm" variant="primary" />
                  <Loader type="bars" size="md" variant="primary" />
                  <Loader type="bars" size="lg" variant="primary" />
                  <Loader type="bars" size="xl" variant="primary" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Variants</h3>
                <div className="flex items-center space-x-4">
                  <Loader type="bars" variant="primary" />
                  <Loader type="bars" variant="secondary" />
                  <Loader type="bars" variant="gray" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">With Text</h3>
                <Loader type="bars" variant="primary" text="Analyzing..." />
              </div>
            </CardContent>
          </Card>

          {/* Pulse Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Pulse Loaders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Sizes</h3>
                <div className="flex items-center space-x-4">
                  <Loader type="pulse" size="sm" variant="primary" />
                  <Loader type="pulse" size="md" variant="primary" />
                  <Loader type="pulse" size="lg" variant="primary" />
                  <Loader type="pulse" size="xl" variant="primary" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Variants</h3>
                <div className="flex items-center space-x-4">
                  <Loader type="pulse" variant="primary" />
                  <Loader type="pulse" variant="secondary" />
                  <Loader type="pulse" variant="gray" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">With Text</h3>
                <Loader type="pulse" variant="primary" text="Syncing..." />
              </div>
            </CardContent>
          </Card>

          {/* Inline Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Inline Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Inline spinner: <Loader type="spinner" size="sm" variant="primary" inline />
                </p>
                <p className="text-sm text-gray-600">
                  Inline dots: <Loader type="dots" size="sm" variant="primary" inline />
                </p>
                <p className="text-sm text-gray-600">
                  Inline bars: <Loader type="bars" size="sm" variant="primary" inline />
                </p>
                <p className="text-sm text-gray-600">
                  Inline pulse: <Loader type="pulse" size="sm" variant="primary" inline />
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-gray-100 rounded-md">
                  <h4 className="font-medium text-sm mb-2">Table Loading</h4>
                  <Loader size="lg" variant="primary" text="Loading data..." centered />
                </div>

                <div className="p-4 bg-gray-100 rounded-md">
                  <h4 className="font-medium text-sm mb-2">Button Loading</h4>
                  <div className="flex items-center space-x-2">
                    <Loader type="dots" size="sm" variant="white" />
                    <span className="text-sm">Saving...</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-100 rounded-md">
                  <h4 className="font-medium text-sm mb-2">Page Loading</h4>
                  <Loader size="xl" variant="primary" text="Loading page..." centered />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
