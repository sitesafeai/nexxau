'use client';

import { useColorMode, useColorModeValue, IconButton, IconButtonProps } from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';

type ColorModeSwitcherProps = Omit<IconButtonProps, 'aria-label'>;

export const ThemeToggle: React.FC<ColorModeSwitcherProps> = (props) => {
  const { toggleColorMode } = useColorMode();
  const text = useColorModeValue('dark', 'light');
  const SwitchIcon = useColorModeValue(MoonIcon, SunIcon);

  return (
    <IconButton
      size="md"
      fontSize="lg"
      variant="ghost"
      color="current"
      marginLeft="2"
      onClick={toggleColorMode}
      icon={<SwitchIcon />}
      aria-label={`Switch to ${text} mode`}
      {...props}
    />
  );
}; 