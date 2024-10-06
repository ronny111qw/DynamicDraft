// app/components/Navbar.tsx
import React from 'react';
import Link from 'next/link';

const Navbar: React.FC = () => {
    return (
        <nav className="bg-gray-800 p-4">
            <div className="container mx-auto flex justify-between items-center">
                <div className="text-white text-lg font-bold">Interview Prep</div>
                <div>
                    <Link href="/" className="text-gray-300 hover:text-white px-4">Home</Link>
                    <Link href="/questions" className="text-gray-300 hover:text-white px-4">Questions</Link>
                    <Link href="/saved" className="text-gray-300 hover:text-white px-4">Saved Sets</Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;