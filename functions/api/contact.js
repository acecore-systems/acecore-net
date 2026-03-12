export async function onRequestPost({ request }) {
  try {
    const data = await request.json()

    if (!data.name || !data.email || !data.message) {
      return new Response(
        JSON.stringify({ error: '必須項目を入力してください' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // TODO: メール送信の実装（Resend / SendGrid / Cloudflare Email Workers 等）
    console.log('Contact form submission:', JSON.stringify(data))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(
      JSON.stringify({ error: '送信に失敗しました' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
