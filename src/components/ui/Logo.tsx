import { Shirt } from 'lucide-react';

interface LogoProps {
  dark?: boolean;
}

const Logo = ({ dark = true }: LogoProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Shirt className={`${dark ? 'text-primary-600' : 'text-white'}`} />
      <span className={`font-serif text-xl font-bold ${dark ? 'text-secondary-900' : 'text-white'}`}>
        LUXE
      </span>
    </div>
  );
};

export default Logo;