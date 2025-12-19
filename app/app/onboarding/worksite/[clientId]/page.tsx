import { notFound } from 'next/navigation';
import WorksiteForm from '@/components/onboarding/WorksiteForm';
import { prisma } from '@/app/lib/prisma';

interface PageProps {
  params: Promise<{
    clientId: string;
  }>;
}

export default async function WorksitePage({ params }: PageProps) {
  const { clientId } = await params;
  const company = await prisma.company.findUnique({
    where: { id: clientId },
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