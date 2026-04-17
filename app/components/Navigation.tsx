'use client';

import { AppBar, Toolbar, Typography, Box, Button, Container, LinearProgress } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  
  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Job Data", href: "/job-data" },
    { label: "Employees", href: "/employees" },
    { label: "Curve Review", href: "/curves-review" },
    { label: "Curves Explainer", href: "/curves-explainer" },
  ];

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Hide after 300ms
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ px: { xs: 0 } }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 0, 
                mr: 4, 
                fontWeight: 700,
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              Capacity Planner
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              gap: 1,
              flexGrow: 1,
              justifyContent: { xs: 'center', md: 'flex-start' }
            }}>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <Button
                    sx={{
                      color: pathname === item.href ? 'white' : 'rgba(255,255,255,0.8)',
                      backgroundColor: pathname === item.href ? 'rgba(255,255,255,0.15)' : 'transparent',
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      fontWeight: pathname === item.href ? 600 : 500,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: pathname === item.href 
                          ? 'rgba(255,255,255,0.25)' 
                          : 'rgba(255,255,255,0.1)',
                        color: 'white',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                      position: 'relative',
                    }}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </Box>

            {/* Build version indicator */}
            <BuildVersion />

            {/* Apps Home button */}
            <Box sx={{ ml: 2 }}>
              <a
                href="https://xzibit-apps.vercel.app"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                ← Apps Home
              </a>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Line loader below header */}
      {isLoading && (
        <LinearProgress 
          sx={{
            height: 2,
            background: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            }
          }}
        />
      )}
    </>
  );
}

function BuildVersion() {
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA || 'unknown';
  const ref = process.env.NEXT_PUBLIC_COMMIT_REF || 'local';
  const env = process.env.NEXT_PUBLIC_BUILD_ENV || 'local';
  const shortSha = sha === 'unknown' ? 'unknown' : sha.slice(0, 7);
  const commitUrl =
    sha === 'unknown'
      ? null
      : `https://github.com/jnebauer/xzibit-capacity-planner/commit/${sha}`;
  const label = env !== 'production' && env !== 'local' ? `${shortSha} · ${env}` : shortSha;

  const chip = (
    <span
      style={{
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.7)',
        background: 'rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
      }}
      title={`commit ${sha}\nbranch ${ref}\nenv ${env}`}
    >
      {label}
    </span>
  );

  if (!commitUrl) return <Box sx={{ ml: 2 }}>{chip}</Box>;
  return (
    <Box sx={{ ml: 2 }}>
      <a
        href={commitUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
      >
        {chip}
      </a>
    </Box>
  );
}
