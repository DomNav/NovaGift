import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, BarChart, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rollout: number;
  metadata?: any;
  conditions?: any;
  createdAt: string;
  updatedAt: string;
}

interface FlagStats {
  total: number;
  enabled: number;
  disabled: number;
  enabledPercentage: number;
}

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [stats, setStats] = useState<Record<string, FlagStats>>({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const response = await fetch('/api/feature-flags/list', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load feature flags');
      }

      const data = await response.json();
      setFlags(data.flags);
      
      // Load stats for each flag
      for (const flag of data.flags) {
        loadFlagStats(flag.key);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFlagStats = async (flagKey: string) => {
    try {
      const response = await fetch(`/api/feature-flags/${flagKey}/stats?hours=24`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ ...prev, [flagKey]: data.stats }));
      }
    } catch (err) {
      console.error(`Failed to load stats for ${flagKey}:`, err);
    }
  };

  const updateFlag = async (flag: FeatureFlag, updates: Partial<FeatureFlag>) => {
    try {
      const response = await fetch(`/api/feature-flags/${flag.key}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update feature flag');
      }

      const data = await response.json();
      setFlags(flags.map(f => f.key === flag.key ? data.flag : f));
      
      // Reload stats
      loadFlagStats(flag.key);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createFlag = async (flagData: {
    key: string;
    name: string;
    description?: string;
    enabled: boolean;
    rollout: number;
  }) => {
    try {
      const response = await fetch('/api/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(flagData),
      });

      if (!response.ok) {
        throw new Error('Failed to create feature flag');
      }

      const data = await response.json();
      setFlags([...flags, data.flag]);
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteFlag = async (flag: FeatureFlag) => {
    if (!confirm(`Are you sure you want to delete the flag "${flag.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/feature-flags/${flag.key}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete feature flag');
      }

      setFlags(flags.filter(f => f.key !== flag.key));
      setSelectedFlag(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading feature flags...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground mt-1">
            Control feature rollouts and A/B testing
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Flag
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flags List */}
        <div className="lg:col-span-2 space-y-4">
          {flags.map(flag => (
            <Card 
              key={flag.id} 
              className={`cursor-pointer transition-colors ${
                selectedFlag?.id === flag.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedFlag(flag)}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{flag.name}</CardTitle>
                    <code className="text-sm text-muted-foreground">{flag.key}</code>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {flag.rollout < 100 && (
                      <Badge variant="outline">{flag.rollout}%</Badge>
                    )}
                  </div>
                </div>
                {flag.description && (
                  <CardDescription className="mt-2">{flag.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(checked) => {
                        updateFlag(flag, { enabled: checked });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <Label>Rollout Percentage</Label>
                      <Slider
                        value={[flag.rollout]}
                        onValueChange={(value) => {
                          updateFlag(flag, { rollout: value[0] });
                        }}
                        max={100}
                        step={5}
                        className="mt-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {stats[flag.key] && (
                    <div className="text-sm text-muted-foreground">
                      <div>{stats[flag.key].total} evaluations</div>
                      <div className="text-green-600">
                        {stats[flag.key].enabledPercentage.toFixed(1)}% enabled
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Details Panel */}
        <div>
          {selectedFlag ? (
            <Card>
              <CardHeader>
                <CardTitle>Flag Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="settings">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="settings">
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </TabsTrigger>
                    <TabsTrigger value="stats">
                      <BarChart className="mr-2 h-4 w-4" /> Stats
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="settings" className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={selectedFlag.name}
                        onChange={(e) => {
                          setSelectedFlag({ ...selectedFlag, name: e.target.value });
                        }}
                        onBlur={() => {
                          updateFlag(selectedFlag, { name: selectedFlag.name });
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={selectedFlag.description || ''}
                        onChange={(e) => {
                          setSelectedFlag({ ...selectedFlag, description: e.target.value });
                        }}
                        onBlur={() => {
                          updateFlag(selectedFlag, { description: selectedFlag.description });
                        }}
                      />
                    </div>

                    <div>
                      <Label>Conditions (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(selectedFlag.conditions || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const conditions = JSON.parse(e.target.value);
                            setSelectedFlag({ ...selectedFlag, conditions });
                          } catch (err) {
                            // Invalid JSON, ignore
                          }
                        }}
                        onBlur={() => {
                          updateFlag(selectedFlag, { conditions: selectedFlag.conditions });
                        }}
                        className="font-mono"
                        rows={6}
                      />
                    </div>

                    <Button
                      variant="destructive"
                      onClick={() => deleteFlag(selectedFlag)}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Flag
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="stats" className="space-y-4">
                    {stats[selectedFlag.key] ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-2xl font-bold">
                              {stats[selectedFlag.key].total}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Total Evaluations
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {stats[selectedFlag.key].enabledPercentage.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Enabled Rate
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Enabled:</span>
                            <span>{stats[selectedFlag.key].enabled}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Disabled:</span>
                            <span>{stats[selectedFlag.key].disabled}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        No statistics available
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  Select a flag to view details
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Flag Dialog */}
      {isCreating && (
        <CreateFlagDialog
          onClose={() => setIsCreating(false)}
          onCreate={createFlag}
        />
      )}
    </div>
  );
}

function CreateFlagDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    enabled: false,
    rollout: 0,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Feature Flag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Key (unique identifier)</Label>
            <Input
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder="e.g., new_feature_xyz"
            />
          </div>
          
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., New Feature XYZ"
            />
          </div>
          
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this feature flag controls..."
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
            <Label>Enabled</Label>
          </div>
          
          <div>
            <Label>Initial Rollout: {formData.rollout}%</Label>
            <Slider
              value={[formData.rollout]}
              onValueChange={(value) => setFormData({ ...formData, rollout: value[0] })}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => onCreate(formData)} className="flex-1">
              Create Flag
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}