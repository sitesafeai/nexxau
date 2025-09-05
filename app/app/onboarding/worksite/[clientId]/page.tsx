import { notFound } from 'next/navigation';
import WorksiteForm from '@/components/onboarding/WorksiteForm';
import { prisma } from '@/app/lib/prisma';

interface PageProps {
  params: {
    clientId: string;
  };
}

export default async function WorksitePage({ params }: PageProps) {
  const company = await prisma.company.findUnique({
    where: { id: params.clientId },
  });

  if (!company) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorksiteForm clientId={company.id} clientName={company.name} />
    </div>
  );
} 