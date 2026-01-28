export default function DesignSystemTest() {
    return (
      <div className="p-8 space-y-8">
        <h1 className="text-4xl font-heading font-bold">Muko Design System</h1>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-heading">Colors</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-24 bg-chartreuse rounded-lg"></div>
              <p className="text-sm">Chartreuse</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-camel rounded-lg"></div>
              <p className="text-sm">Camel</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-steel rounded-lg"></div>
              <p className="text-sm">Steel Blue</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-rose rounded-lg"></div>
              <p className="text-sm">Dusty Rose</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-heading">Typography</h2>
          <p className="text-lg font-body">Body text using Inter</p>
          <h3 className="text-xl font-heading font-bold">Heading using Söhne (fallback)</h3>
        </div>
      </div>
    );
  }