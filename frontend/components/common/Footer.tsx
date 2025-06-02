import Link from 'next/link';
import { BarChart2, Twitter, Linkedin, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 pt-16 pb-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <BarChart2 className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-xl">ElectionPulse</span>
            </div>
            <p className="text-muted-foreground mb-6">
              Comprehensive election analysis and predictions from leading political experts.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-blue-600">
                <Twitter size={20} />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-blue-600">
                <Linkedin size={20} />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-blue-600">
                <Facebook size={20} />
              </Link>
            </div>
          </div>
          
          {/* Analysis Links */}
          <div>
            <h3 className="font-semibold text-lg mb-6">Analysis</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/analysis/presidential" className="text-muted-foreground hover:text-blue-600">
                  Presidential
                </Link>
              </li>
              <li>
                <Link href="/analysis/congressional" className="text-muted-foreground hover:text-blue-600">
                  Congressional
                </Link>
              </li>
              <li>
                <Link href="/analysis/local-elections" className="text-muted-foreground hover:text-blue-600">
                  Local Elections
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="font-semibold text-lg mb-6">Resources</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/resources/methodology" className="text-muted-foreground hover:text-blue-600">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/resources/data-sources" className="text-muted-foreground hover:text-blue-600">
                  Data Sources
                </Link>
              </li>
              <li>
                <Link href="/about-us" className="text-muted-foreground hover:text-blue-600">
                  About Us
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-800 mt-12 pt-8 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} ElectionPulse. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}