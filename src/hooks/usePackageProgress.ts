import { useState, useEffect } from 'react';
import { PackageType } from '@/lib/seo-packages/definitions';

export function usePackageProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/package-progress');
      if (!response.ok) throw new Error('Failed to fetch progress');
      const data = await response.json();
      setProgress(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { progress, loading, error, refetch: fetchProgress };
}