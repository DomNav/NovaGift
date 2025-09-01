import { useParams } from 'react-router-dom';

export function ProjectDetail() {
  const { id } = useParams();
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-brand-text dark:text-white mb-4">
        Project: {id}
      </h1>
      <p className="text-brand-text/70 dark:text-white/70">
        Project detail for {id} (coming soon)
      </p>
    </div>
  );
}
