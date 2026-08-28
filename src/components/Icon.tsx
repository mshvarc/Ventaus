import { ArrowDown } from '@phosphor-icons/react/ArrowDown';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { Check } from '@phosphor-icons/react/Check';
import { List } from '@phosphor-icons/react/List';
import { MagnifyingGlassPlus } from '@phosphor-icons/react/MagnifyingGlassPlus';
import { X } from '@phosphor-icons/react/X';
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react/lib';

interface IconProps {
  name: 'arrow-right' | 'arrow-down' | 'menu' | 'close' | 'zoom' | 'check';
  className?: string;
}

export const Icon = ({ name, className }: IconProps) => {
  const commonProps: PhosphorIconProps = {
    className,
    size: 20,
    weight: 'thin',
    'aria-hidden': true,
  };

  if (name === 'arrow-right') {
    return <ArrowRight {...commonProps} />;
  }
  if (name === 'arrow-down') {
    return <ArrowDown {...commonProps} />;
  }
  if (name === 'menu') {
    return <List {...commonProps} />;
  }
  if (name === 'close') {
    return <X {...commonProps} />;
  }
  if (name === 'zoom') {
    return <MagnifyingGlassPlus {...commonProps} />;
  }
  return <Check {...commonProps} />;
};
