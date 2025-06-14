'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { theme } from '@/lib/theme';

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChakraProvider theme={theme}>
      {children}
    </ChakraProvider>
  );
} 