import test from 'brittle'
import tmp from 'test-tmp'
import ChannelStore from './index.js'
import crypto from 'hypercore-crypto'

test('example', async function (t) {
  t.plan(4)
  const { publicKey: aliceKey, secretKey: alicePrimaryKey } = crypto.keyPair()
  const { publicKey: bobKey, secretKey: bobPrimaryKey } = crypto.keyPair()

  const alice = new ChannelStore(await tmp(t), { primaryKey: alicePrimaryKey })
  const aliceSharedSecret = await alice.deriveSharedSecret(bobKey)
  const aliceToBob = await alice.createKeyPair(aliceSharedSecret)
  const core = alice.get({ keyPair: aliceToBob })
  await core.ready()
  await core.append('hi bob!')

  const bob = new ChannelStore(await tmp(t), { primaryKey: bobPrimaryKey })
  const bobSharedSecret = await bob.deriveSharedSecret(aliceKey)
  const bobFromAlice = ChannelStore.derivePublicKey(aliceKey, bobSharedSecret)
  const clone = bob.get({ publicKey: bobFromAlice })
  await clone.ready()

  t.alike(core.keyPair.publicKey, aliceToBob.publicKey)
  t.alike(aliceToBob.publicKey, bobFromAlice)
  t.alike(bobFromAlice, clone.keyPair.publicKey)

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
