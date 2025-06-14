import { notFound } from 'next/navigation';
import WorksiteForm from '@/components/onboarding/WorksiteForm';
import prisma from '@/lib/prisma';

interface PageProps {
  params: {
    clientId: string;
  };
}

export default async function WorksitePage({ params }: PageProps) {
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorksiteForm clientId={client.id} clientName={client.name} />
    </div>
  );
} 