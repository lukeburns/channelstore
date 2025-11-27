import test from 'brittle'
import tmp from 'test-tmp'
import b4a from 'b4a'
import Corechannels from './index.js'
import crypto from 'hypercore-crypto'

test('ed25519 secret as primaryKey', async function (t) {
  t.plan(1)

  const alicePrimaryKey = b4a.from(
    'fe09664f812e27e43982ad43f69e68b99665733a3d65cb6a0ba853d3761aafa8e1e716536d45f8f29e8f3ae79a81e44d6a7f7d5dde58187663e33e352e2285f8',
    'hex'
  )
  const { publicKey: aliceKey, secretKey: aliceSecretKey } = crypto.upgrade(alicePrimaryKey)
  const { publicKey: bobKey, secretKey: bobPrimaryKey } = crypto.keyPair()

  const alice = new Corechannels(await tmp(t), {
    primaryKey: alicePrimaryKey,
    ed25519: true,
    unsafe: true
  })
  const core = alice.get({ name: `mail@${b4a.toString(bobKey, 'hex')}` })
  await core.ready()
  await core.append('hi bob!')

  const bob = new Corechannels(await tmp(t), { primaryKey: bobPrimaryKey, unsafe: true })
  const clone = bob.get({ name: `@${b4a.toString(aliceKey, 'hex')}/~mail` })
  await clone.ready()

  const a = alice.replicate(true)
  const b = bob.replicate(false)
  a.pipe(b).pipe(a)

  clone.on('append', async () => {
    const msg = (await clone.get(0)).toString()
    t.alike(msg, 'hi bob!')
    await alice.close()
    await bob.close()
    await clone.close()
  })
})
