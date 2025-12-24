import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const features = [
    {
      title: 'Unified Inbox',
      description: 'Manage all WhatsApp conversations from a single, intuitive interface with real-time notifications.',
      icon: '📧',
      color: 'emerald'
    },
    {
      title: 'Agent Management',
      description: 'Admins can easily add, monitor, and manage agents with role-based permissions and activity tracking.',
      icon: '👥',
      color: 'blue'
    },
    {
      title: 'Automations & Chatbots',
      description: 'Set up intelligent automated responses, chatbots, and workflows to handle common queries 24/7.',
      icon: '🤖',
      color: 'purple'
    },
    {
      title: 'Advanced Analytics',
      description: 'Track performance metrics, conversation insights, and agent activity with detailed reporting dashboards.',
      icon: '📊',
      color: 'indigo'
    },
    {
      title: 'Seamless Integration',
      description: 'Official WhatsApp Business API integration with webhook support and real-time message delivery.',
      icon: '📱',
      color: 'cyan'
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      {/* Floating particles background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-20 w-4 h-4 bg-emerald-300 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-80 right-20 w-6 h-6 bg-cyan-300 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-80 w-3 h-3 bg-emerald-200 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <header className="backdrop-blur-md bg-white/95 border-b border-white/30 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg mr-3">
                <span className="text-2xl">📱</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-emerald-700 bg-clip-text text-transparent">WhatsApp CRM</h1>
            </div>

            <nav className="hidden md:flex space-x-8">
              <Link to="#features" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link to="#how-it-works" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors relative group">
                How It Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link to="#pricing" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors relative group">
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link to="#contact" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors relative group">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
            </nav>

            <Link
              to="/login"
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-emerald-500/25 transform hover:scale-105 transition-all duration-300"
            >
              Admin Portal
            </Link>

            {/* Mobile menu button */}
            <button className="md:hidden text-gray-700 hover:text-emerald-600 p-2 rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="backdrop-blur-xl bg-white/90 border border-white/30 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-5xl mx-auto">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl mb-6 shadow-xl">
                <span className="text-3xl">📱</span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-emerald-700 bg-clip-text text-transparent mb-6">
              Transform Your WhatsApp Business
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Streamline customer conversations, automate responses, and unlock powerful insights with our modern WhatsApp CRM platform.
              Built for teams that demand efficiency and results.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/login"
                className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-emerald-500/25 transform hover:scale-105 transition-all duration-300"
              >
                Start Admin Portal
              </Link>

              <Link
                to="#features"
                className="border-2 border-gray-300 hover:border-emerald-300 text-gray-700 hover:text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-50 transform hover:scale-105 transition-all duration-300"
              >
                Explore Features
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-10 w-64 h-64 bg-gradient-to-r from-emerald-400/10 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-10 w-80 h-80 bg-gradient-to-r from-cyan-400/10 to-emerald-500/10 rounded-full blur-3xl"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Features header */}
          <div className="text-center mb-16">
            <div className="backdrop-blur-xl bg-white/90 border border-white/30 rounded-3xl p-8 shadow-xl inline-block">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl mb-6 shadow-lg">
                <span className="text-2xl">⚡</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-emerald-700 bg-clip-text text-transparent mb-4">
                Powerful Features for Modern Teams
              </h2>

              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to manage WhatsApp conversations at scale with cutting-edge tools and seamless integrations.
              </p>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="backdrop-blur-xl bg-white/90 border border-white/30 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-emerald-500/10 hover:scale-105 transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 to-cyan-500/3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 rounded-xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                    <span className="text-2xl">{feature.icon}</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 text-center group-hover:text-emerald-700 transition-colors duration-200">
                    {feature.title}
                  </h3>

                  <p className="text-gray-600 text-center leading-relaxed">
                    {feature.description}
                  </p>

                  <div className={`mt-6 h-1 w-20 bg-gradient-to-r from-${feature.color}-500 to-${feature.color}-600 rounded-full mx-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section decoration */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-r from-emerald-400/5 to-cyan-500/5 rounded-full blur-3xl"></div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="backdrop-blur-xl bg-white/90 border border-white/30 rounded-3xl p-8 sm:p-12 shadow-xl">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl mb-6 shadow-lg mx-auto">
                <span className="text-2xl">🚀</span>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-emerald-700 bg-clip-text text-transparent mb-6">
              Ready to Transform Your Business?
            </h2>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Join thousands of businesses revolutionizing their customer communication with our powerful WhatsApp CRM platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-emerald-500/25 transform hover:scale-105 transition-all duration-300"
              >
                Get Started Today
              </Link>

              <Link
                to="#features"
                className="border-2 border-gray-300 hover:border-emerald-300 text-gray-700 hover:text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-50 transform hover:scale-105 transition-all duration-300"
              >
                See All Features
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;