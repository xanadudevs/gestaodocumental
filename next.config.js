/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Os templates Word são lidos do disco em runtime: incluí-los na função
  // serverless que gera o .docx.
  outputFileTracingIncludes: {
    "/api/documents/[id]/docx": ["./templates/**"],
  },
};

module.exports = nextConfig;
