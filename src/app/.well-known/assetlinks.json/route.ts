import { NextResponse } from 'next/server';

export async function GET() {
  const assetlinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "app.vercel.flat_mate_ashy.twa",
        sha256_cert_fingerprints: [
          "AB:93:A4:30:FA:11:42:97:94:A1:31:60:1F:DC:BF:66:74:C0:10:4E:25:14:D7:FC:08:02:DA:FF:F6:32:EF:1F"
        ]
      }
    }
  ];

  return new NextResponse(JSON.stringify(assetlinks, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
