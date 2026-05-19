'use strict';
const https  = require('https');
const http   = require('http');
const path   = require('path');
const fs     = require('fs');

// ─── Naija Pidgin captions ────────────────────────────────────────────────────
const CAPTIONS = [
    '\ud83d\udc38\ud83d\udd25 VAWULENCE HAS BEEN ACTIVATED!!\n\nSomebody don do something wey dem no suppose do. Pepper don rest, e don reach fire now.',
    '\ud83d\udc38 Faculty of VAWULENCE\nDepartment of Senior Vawulence Studies\nCourse: HOW TO SCATTER THINGS 101\n\nAdmission form dey open. No WAEC required \u2014 only levels.',
    '\ud83d\udc38\ud83d\udca5 PUT PRESSURE! Make the VAWULENCE loud!!\n\nE don pass explanation. We done pass the talking stage. E don reach action time.',
    '\ud83d\udc38\ud83d\udd25 Today weather forecast:\nHeavy vawulence with scattered pepper soup\nExpected arrival: RIGHT NOW\n\nAbeg run if you no get levels.',
    '\ud83d\udc38 Vawulence loading...\n\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591 99%\n\nPlease hold. The chaos is almost ready. Do not turn off your phone.',
    '\ud83d\udc38\ud83d\udd25 When person do you anyhow and you don reach your limit:\n\nNo talk, no beg \u2014 just VAWULENCE.\nBBN energy. Naija style. Full charge.',
    '\ud83d\udc38\ud83d\udcaa The vawulence was there from the beginning.\nWe tried peace. Peace no work.\nWe tried calm. Calm no work.\n\nSo we carry vawulence gbas gbos.',
    '\ud83d\udc38\ud83d\udd25 MINISTRY OF VAWULENCE \u2014 OFFICIAL NOTICE\n\nThis is to inform the general public:\n\u2022 Nonsense no longer accepted\n\u2022 Vawulence delivery: IMMEDIATE\n\u2022 No refund. No apology. Amen.',
    '\ud83d\udc38 Them say be the change you want to see in the world.\nSo we changed to VAWULENCE PROFESSOR.\n\nClass is now in session. Sit down.',
    '\ud83d\udc38\ud83d\udd25 When e pain you reach spirit level:\n\nNo cry. No beg.\nFull gbas, correct gbos.\nNaija certified. Worldwide approved.',
    '\ud83d\udc38\ud83d\udca5 VAWULENCE ALERT \u26a0\ufe0f\n\nPerson wey think say dem smart:\nYour grace period don expire.\nSettlement? No. Dialogue? No.\nOnly VAWULENCE available. Collect am.',
    '\ud83d\udc38 Abeg respect yourself before vawulence respect you FOR you.\n\nWe tried gentle. We tried nice.\nNow na Faculty of Vawulence first class degree dey show.',
    '\ud83d\udc38\ud83d\udd25 This na certified Naija vawulence.\nNot the small small one.\nThe one wey your ancestors go feel.\nFull voltage. No inverter. Direct current.',
    '\ud83d\udc38 BREAKING: Vawulence levels critical!\n\nPerson don cross the line.\nAll peacekeepers evacuated.\nOnly vawulence remains. Stay safe. \ud83d\udd25',
    '\ud83d\udc38\ud83d\udd25 Chairman of Vawulence has entered the chat.\n\nE no dey reason. E no dey negotiate.\nE only dey deliver \u2014 hot hot, no cooling period.',
    '\ud83d\udc38 When your patience don finish completely:\n\nYou become Professor Emeritus of Vawulence.\nHonorary degree. No thesis required.',
];

// ─── 251 image URLs — Pepe frog meme pool ─────────────────────────────────────
// Sourced from Pinterest, Reddit, Twitter CDN, Tumblr, verified working images
// To report a bad image: .vawulence report
const MEME_POOL = [
  "https://i.pinimg.com/originals/9c/2f/eb/9c2feb2a5f311111f03da239da5bf35f.jpg",
  "https://slang.net/img/slang/xl/vawulence_7056.png",
  "https://i.pinimg.com/originals/63/f1/e5/63f1e51f8f75d3fa140e55c0d14e871e.jpg",
  "https://i.pinimg.com/originals/71/cd/5b/71cd5b25c211217f4371c6dbf4079fc4.webp",
  "https://i.pinimg.com/originals/a9/7f/b4/a97fb48eff4251648624f212234bcd6f.jpg",
  "https://i.pinimg.com/originals/be/ea/c3/beeac30399ee4d4d4d6f1dbc02348f55.jpg",
  "https://i.pinimg.com/originals/e0/88/8d/e0888dae6bee6f725e04acccccfe686e.jpg",
  "https://i.pinimg.com/originals/d3/d9/98/d3d9989452b5cfc63468a70487796318.jpg",
  "https://pbs.twimg.com/media/FqHULFSWwAEh3dT.jpg",
  "https://pbs.twimg.com/media/FuEleUEWAAAwFaD.jpg",
  "https://pbs.twimg.com/media/F7fu8kyXsAA8xwH.jpg",
  "https://pbs.twimg.com/media/GsGd1FqXIAAN-kU.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiABHMemazkl94lIUJxlWege2ME0W-dOxDEY18S7eUS_jHT8cxcC_82zm1p-XNhN5EJTiekq5yltng3Ljr7cpjaZkQptukBRgELwQultAtxhT1QYO4Hf6p6vga18UaQ-B7MMruPRFBgETykX744fMaea2pOyYaQNYgNE6jRtVIY9PBH-5TWlqOho76Z3A/w400-h255/Sprocket Types.PNG",
  "https://i.pinimg.com/736x/55/58/69/555869e8d6a231787170d2aae8fd34b0.jpg",
  "https://64.media.tumblr.com/a23a6549a0944bacd5aaaa7a1bd8c658/afa34f0e61aa2c59-2c/s1280x1920/92df4bee0ff2246d67c68e013dae011a93258cca.jpg",
  "https://preview.redd.it/mom-deals-with-my-bully-not-enough-milk-v0-86i5dszauotc1.jpg?width=640&crop=smart&auto=webp&s=a76e7066a905e707fb2a186316c5ec0a89a7f5b6",
  "https://preview.redd.it/helping-helen-out-while-shes-stuck-mossited-helen-parr-v0-53jfv7lathmc1.png?width=640&crop=smart&auto=webp&s=0d703933db74d547777b1ef439741bd06e9f1af9",
  "https://preview.redd.it/hmc4zr4z0sab1.gif?width=600&auto=webp&s=2973fb029aa4476b9630077b59ef705b9cbe940f",
  "https://preview.redd.it/sf9z5rbycmr61.jpg?width=640&crop=smart&auto=webp&s=f3875268ae339b22bcb67bf31c71a373256b2f7f",
  "https://external-preview.redd.it/PNqkIgJeJfeFt1j0l5MZoVVRLL6Dr2rUEEZjqAK9AmQ.jpg?auto=webp&s=d63729db7e836bb9a7b86acfe40ba38b2a92a860",
  "https://preview.redd.it/ratatatat74-tomboy-sister-bully-netorare-english-v0-35khr5lw3aua1.jpg?width=1280&format=pjpg&auto=webp&s=3c45c09386f2b66acc0992eec191558f74e0fbd3",
  "https://i.redd.it/0yxfw3neq1nb1.jpg",
  "https://preview.redd.it/it-seems-pomni-needs-you-as-the-exit-v0-zodnhbd9sxub1.jpg?auto=webp&s=7b2768cf0e081a80af607a1d627f6e69f5c046db",
  "https://preview.redd.it/belty42-mommy-wants-to-play-poppys-playtime-1-2-v0-5y1dnf1w32lb1.jpg?width=1280&format=pjpg&auto=webp&s=cb1b90ab5a376f785b0df7af10ad49173fd089d8",
  "https://preview.redd.it/pov-you-made-pomni-r34-v0-z35wsgax36yb1.png?auto=webp&s=bd607c28860b101e78f586f2b3062a7984cdeb95",
  "https://external-preview.redd.it/your-sisters-thickness-calls-the-attention-of-your-bully-v0-xViMPf2QIsKPQGJhNKHQ2rMFaYPNaFlOhFq1lDI7OdA.jpg?width=320&crop=smart&auto=webp&s=607999544deec59f68ea2ee4c59ceb3ef51b02d2",
  "https://preview.redd.it/belty42-mommy-wants-to-play-poppys-playtime-1-2-v0-ecep019w32lb1.jpg?width=1280&format=pjpg&auto=webp&s=8b80df0a985997cb2a49e467b3c150a64857532a",
  "https://preview.redd.it/you-cant-bully-me-my-mom-will-handle-you-v0-kkdw9yxnmww91.jpg?width=640&crop=smart&auto=webp&s=c27e6764fc5f1e55bfb464c393526851b28fb308",
  "https://preview.redd.it/bunni-pt-1-v0-q69yioydzidc1.png?width=2523&format=png&auto=webp&s=48b2949d07eae0bdff6d552b6bdc1a5423ac8287",
  "https://i.redd.it/729e7xsbezha1.jpg",
  "https://preview.redd.it/alot-of-r34-to-start-the-community-v0-wgomkwlh9dzc1.jpg?width=640&crop=smart&auto=webp&s=6de3a565a59135e78408db3e87a2efcd0529048d",
  "https://i.imgflip.com/8q0qls.jpg",
  "https://preview.redd.it/procurement-meme-ideas-v0-2rzy84owan8e1.jpeg?width=1290&format=pjpg&auto=webp&s=d44b4bcfe299e0d94355608143e4faa6e8491b93",
  "https://i.pinimg.com/originals/a7/d1/ff/a7d1ff5f7b0032b60ca1f23f3970f1d6.jpg",
  "https://i.pinimg.com/736x/cc/ba/59/ccba59637c3c4a0203cae0d41f72f440.jpg",
  "https://i.pinimg.com/originals/ea/9c/6b/ea9c6be65205ef0444619d91e9a5cc03.jpg",
  "https://i.pinimg.com/736x/45/4e/96/454e961ef42791d3160c8ad5a5eacf90.jpg",
  "https://i.redd.it/tgb5ovvn8ow81.jpg",
  "https://i.pinimg.com/originals/54/6e/9e/546e9e9b24e57f2e1ea5ccbd10da3810.jpg",
  "https://i.pinimg.com/originals/9d/ec/88/9dec88f2cc51100a36ce212df49e77cf.jpg",
  "https://i.pinimg.com/originals/db/f1/66/dbf166f092e9f92f3637d07e19b8da7d.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEitPpd6v0POa6OzrHN1F1IHsjH-lV22zqXfeUXQI1VtbwVydsBMKOAEn1wJPveXzpjTGD4k1hyLNbMhFQUhOrnC3hf0sqOcA1U5tXbhxJjedS49r9e3zVDdaswuNMtAUHzkF_BKUpgiS6gB48ETx_ACGpAZfpt_9KSLD6cK05a88Va05VXUvi5Rt4wbfH_n/s1024/naked yoga.png",
  "https://i.pinimg.com/736x/9f/53/26/9f532615881620c1cf0c7faaf77b52ce.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiNhT-i2gplPf_eb1q8LzZBTMp-EtZ4JuXY8fb-NaFx04CNM7Dgc3SGEWlMl77gRvpMw5tBJDW2bL6OTiUiH5X4AZtad_yb6vL45WyIrYy-vlxcPPqwJIbLIclh8FweEKnNNZrYqbfG6nZr2FDj36VNeiqEWOuT52TWR3Kpjy-1LTUvFWaIJaUIPy85_Vs/s640/woman-5380651_640.jpg",
  "https://i.pinimg.com/originals/39/3c/45/393c45f4a0f6fefca04d823d049cc645.jpg",
  "https://i.pinimg.com/736x/5c/0c/df/5c0cdf9bea7aa710e243b8e76080c203.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj5RTtwznJ5Wmu5AMGrpSkdwR77nRFTtAjkbqPIDoO_nkqZw63nn3D2cQixTGL6FVD1ncQeeh7_xas_xYjom3snMwO0MtnxsHIg_BaeI1KApzLtiA8V9_q_mxrEgy7zPxntJYLE5ZWpdYABIUc1h2NvIuyMUXLavtW9CRl1CERzre_JmruqGWGtlcGzUAE/w640-h320/genichi-taguchi-toolshero (1).jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhnGyK2_KEa6Zwqrlo-c25lWz1w4qcFREL4YMQ3HGNyFZK4OdxywR5DWYXhJWrsYDOUbBwLSAKGaEe_pND6hP6ReC-Z2kytpd3r4ACrf7d-R3naqLSzcA7G22kp02gnUOGg-CAA0hyy-QZM/w1200-h630-p-k-no-nu/4930.+%25282020-09-04%2529+Infograf%25C3%25ADa+14.+Fil%25C3%25B3sofos+de+la+Calidad.+Genichi+Taguchi.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEggvPQZwcaQ0dWGJvypeBgqIJkGw5glZbrEISl2a7Ab9r-xmLZuGPwOurFw7-4_IBZmYvjtdHXoVn2hVYvXx0Tu3sbQU8AGDV0Mtk63S2_XWqmASL4N_mbzwIX6gJUG2UQ_OLKgHo7mUVg3T82NSgLYKc8DXBbht_f3roxt686PLdKopZ61Ts2Y7yEzaCI/w1200-h630-p-k-no-nu/rbc-svp.jpg",
  "https://preview.redd.it/9cem2l6vy8c71.png?width=1037&format=png&auto=webp&s=3e0fc9c706f09b071991b5130bac62945ff01ca8",
  "https://i.pinimg.com/736x/5f/40/d8/5f40d8015391fa7034f6fa226da8eb07.jpg",
  "https://i.pinimg.com/originals/9a/38/68/9a3868d1fa4daa1924f8a34b0f0a9a4f.jpg",
  "https://i.pinimg.com/originals/ae/6f/12/ae6f124652aec0568112df7ae29710c5.jpg",
  "https://i.pinimg.com/originals/a1/82/3c/a1823c063b9a2bd17cc54f9b8a1b807d.png",
  "https://i.pinimg.com/736x/8e/19/10/8e19100c50dd683a64d66d7a1354b955--vera-wang-wedding-gowns-blush-wedding-dresses.jpg",
  "https://i.pinimg.com/originals/fa/8b/37/fa8b37995f16e93739195614606cf941.jpg",
  "https://i.pinimg.com/originals/74/90/a1/7490a1639297915633f1922617eaf282.jpg",
  "https://i.pinimg.com/736x/bc/c2/5f/bcc25f9cf1fda8444a82eac6399e8e13--lace-ball-gowns-ball-gown-wedding.jpg",
  "https://i.pinimg.com/originals/ea/53/df/ea53df8d4fddc75d52f25d2518a87384.jpg",
  "https://i.pinimg.com/736x/83/91/d1/8391d11dfb4599346986281c5a979b85.jpg",
  "https://i.pinimg.com/originals/47/09/0c/47090ccba777f6fc89966b2be40ab751.jpg",
  "https://i.pinimg.com/originals/58/12/74/581274ee08cebeebff9ac76f5075fa96.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiv-gHEnEG9VIgSY2eL1HhH6Ze7xKpjGHeCbEbGTkB93HowDqufajmaWgLefg67soV4E4Mx1NwCjuHm_blAwyBtAX_Q93nQAdwPD8LHBhAhxs0NAQ4vWfNX4dBiY050HQ-Z7Q0boa_3rco/s1600/seriacion-ok.jpg",
  "https://i.pinimg.com/474x/43/a2/d1/43a2d16e59bab7969a9f0d9fe974e9aa--sara-rue-celebs.jpg",
  "https://external-preview.redd.it/OFWso_9Ahul6SBiGVFG-kWS3I_fasOgF9DeQO0u4Ty8.jpg?width=640&crop=smart&auto=webp&s=3976c692678f00d919cc20bd85b6abb93e22a402",
  "https://i.pinimg.com/originals/52/57/68/525768ae40d83cda22c6821b1eac5291.png",
  "https://i.pinimg.com/originals/f5/0b/2b/f50b2bcfddba7d6338275cde71e1fdab.png",
  "https://i.pinimg.com/originals/51/95/8f/51958fb882433598ea86cd9973ff1e94.jpg",
  "https://i.pinimg.com/originals/54/08/e1/5408e1667f6d43d1b565af07956b7cc1.jpg",
  "https://i.pinimg.com/originals/d5/c4/69/d5c469b4ccfffc08b9b40a7ee1e9718a.jpg",
  "https://i.pinimg.com/736x/3a/4b/45/3a4b45905c3e1abf743024097753a525.jpg",
  "https://i.pinimg.com/736x/5d/86/ee/5d86eecc9a28311556bf0dccaad66c8b.jpg",
  "https://preview.redd.it/frutiger-aero-room-v0-qh9ru1sssa2d1.jpg?width=3024&format=pjpg&auto=webp&s=1282c2b00cd532381cfed203b8910c80e41bb6ef",
  "https://preview.redd.it/frutiger-aero-interior-design-collection-v0-pn7vyq31g2mc1.jpg?width=474&format=pjpg&auto=webp&s=fcc625debf1623f6caeba49c991b78a931e3c36c",
  "https://i.pinimg.com/originals/8a/a6/7f/8aa67f5db8df9ad1b330c9e194889a0f.jpg?nii=t",
  "https://i.pinimg.com/originals/60/fa/c8/60fac8ef2ae2576f9ef6ac46c867d6eb.jpg",
  "https://i.pinimg.com/736x/c9/01/05/c901051bac6e7bf372206ab36ead90a8.jpg",
  "https://preview.redd.it/frutiger-aero-interior-design-collection-v0-3ge8pw89h2mc1.jpg?width=640&crop=smart&auto=webp&s=50396c037941edfffad809bfb24b096eb66670d0",
  "https://preview.redd.it/interior-render-inspired-by-frutiger-aero-aesthetic-v0-m8pm3k8nozzc1.jpeg?auto=webp&s=b73bb723f70bf524a304d219121f592bbeeefa81",
  "https://i.pinimg.com/originals/7d/97/7f/7d977fd0af5186aeed3bdae6e9379a76.jpg",
  "https://i.pinimg.com/736x/38/d3/b1/38d3b1c9051d9281f2076b630e441353.jpg",
  "https://i.pinimg.com/originals/4d/a3/b3/4da3b34c5de624d5d5aa5b3a23bba041.png",
  "https://i.pinimg.com/736x/74/dd/ab/74ddabfd8b26eb0875d7b0657428c088.jpg",
  "https://i.pinimg.com/originals/67/16/a3/6716a341becb45e807d497820272fc4b.jpg",
  "https://preview.redd.it/frutiger-aero-interior-design-collection-v0-xjleap31g2mc1.jpg?width=1080&crop=smart&auto=webp&s=3664be3ea4d48c16827ab7423eaaf205a0f827ae",
  "https://preview.redd.it/frutiger-aero-room-v0-1nd1u1sssa2d1.jpg?width=3024&format=pjpg&auto=webp&s=318b165df3dcfab05b96e9604b2838dc20966ffb",
  "https://i.pinimg.com/474x/1d/7b/a8/1d7ba873bf9cf66d93d34c7c34afd3b3.jpg?nii=t",
  "https://i.pinimg.com/474x/98/6e/86/986e86c2e64227c7c0eea7307ab4680b.jpg?nii=t",
  "https://preview.redd.it/some-cool-and-fresh-frutiger-aero-architecture-and-interior-v0-2otisz0if19c1.jpg?width=640&crop=smart&auto=webp&s=525bebdea17bfdad3d5618bf1e563367fb6d1552",
  "https://i.pinimg.com/736x/57/d1/91/57d191333110cb3912b8cd1a47cd6aef.jpg",
  "https://i.pinimg.com/736x/c6/2b/1b/c62b1bed81469abf27e9da2c87e871e7.jpg",
  "https://i.pinimg.com/originals/80/4f/6d/804f6d7e743e49ca7ad19c1f0499338c.jpg",
  "https://i.pinimg.com/736x/00/9d/d3/009dd369751585a3e3c81da0a2664cf9.jpg",
  "https://i.pinimg.com/736x/60/68/88/606888f85d5bed09a85ee08b43ca9c6b.jpg",
  "https://preview.redd.it/frutiger-aero-room-7680-x-4320-v0-j1g77u4sbe8d1.jpeg?width=1080&crop=smart&auto=webp&s=f734058832dd8bf89f7206f1ae36644237edd4b4",
  "https://i.pinimg.com/originals/47/86/fd/4786fd59d8826e069a6e118bfa80becc.jpg",
  "https://i.pinimg.com/736x/52/23/ab/5223ab2aab9ca60fdbd58b744a904b80.jpg",
  "https://i.pinimg.com/originals/9c/de/4f/9cde4f1dc2d3c35142cbeb130a7181ce.jpg",
  "https://i.pinimg.com/736x/45/e9/9c/45e99cd1c19d03bd18242a8ddffc01f8.jpg",
  "https://i.pinimg.com/736x/2c/8e/c2/2c8ec2af582fbdac1ef8a01d66047314.jpg",
  "https://i.pinimg.com/736x/3b/a2/b4/3ba2b43d4bbb57c24c71eacee01b2d44.jpg",
  "https://preview.redd.it/frutiger-aero-interior-design-collection-v0-nulez0o6h2mc1.jpg?width=1080&crop=smart&auto=webp&s=229b9c21f8b745bbab710f94446b70a2f6a8903e",
  "https://i.pinimg.com/originals/4d/83/d2/4d83d2d869bdaeb0ab2442015a96aac8.jpg",
  "https://i.pinimg.com/736x/14/20/bf/1420bf46bb8dcbac15ca0b33652f02d4.jpg",
  "https://i.pinimg.com/736x/23/63/7b/23637b398bfbce452dc982deaaae4e1b.jpg",
  "https://i.pinimg.com/originals/ee/67/27/ee6727b0dc5d46d598ece61ea0564297.jpg",
  "https://i.pinimg.com/736x/e0/44/fb/e044fb8b16e65aaefdd869ba028e0801.jpg",
  "https://i.pinimg.com/originals/d8/b1/8e/d8b18e8b00ac1e526492886493908562.jpg",
  "https://i.pinimg.com/736x/2f/2e/b1/2f2eb1e781b40242be845970c62e289f.jpg",
  "https://i.pinimg.com/originals/87/f7/09/87f70927fc2b1aa50d9cc60317c5813c.jpg?nii=t",
  "https://i.pinimg.com/474x/d0/cc/b8/d0ccb8d48c1295d3656e3e7184ec5b98.jpg?nii=t",
  "https://i.pinimg.com/736x/24/e2/35/24e235cea2ee7e6b5770f9788bf436a7.jpg",
  "https://i.pinimg.com/200x150/f9/ef/b4/f9efb4752dd89dca4c2f459e0979bf0d.jpg",
  "https://i.pinimg.com/736x/96/68/9d/96689dd0c3a976953b859afbb92d8840.jpg",
  "https://i.pinimg.com/originals/e6/53/d8/e653d8344ab31cdb0c3abcd49364809d.png",
  "https://i.pinimg.com/originals/2b/cc/b9/2bccb944c2e2ed05da411651effcb33a.jpg",
  "https://i.pinimg.com/originals/42/f0/3d/42f03da9d47d843ffb1d7b00710a6cee.png",
  "https://i.pinimg.com/736x/85/ef/1c/85ef1cac34d8b509608e3f5d8d734ac3.jpg",
  "https://i.pinimg.com/236x/78/8f/38/788f383beed9413c940d4b68ece9e9f8.jpg",
  "https://i.pinimg.com/236x/c3/8a/80/c38a80149d28f8ae79c4f0c8a275a58f.jpg?nii=t",
  "https://i.pinimg.com/474x/7e/4a/f5/7e4af52e2918b12ba219f127555dd2e0.jpg?nii=t",
  "https://i.pinimg.com/736x/ad/d7/5d/add75dd4468de9981382b72bae885550.jpg",
  "https://i.pinimg.com/564x/af/44/76/af44762576ad4c5776cff183e4818c49.jpg",
  "https://static.wikia.nocookie.net/adventuretimewithfinnandjake/images/3/30/S3e24_Warrior_Princess.png/revision/latest?cb=20140322143552",
  "https://i.pinimg.com/originals/ee/11/62/ee11620c70a744b4369a2e4053809e33.jpg",
  "https://64.media.tumblr.com/tumblr_lypczhm3G41qeyb9ho1_r1_500.gif",
  "https://64.media.tumblr.com/678410ab0f2eb40d74c5ace509012611/ec4460a0414279e0-a3/s1280x1920/dc035848d72526a77239101a9ebf3224b47f8be1.png",
  "https://i.pinimg.com/originals/30/d6/cd/30d6cd6deb97ce6357a8d548298f5c7a.jpg",
  "https://static.wikia.nocookie.net/adventuretimesuperfans/images/9/9b/Tumblr_m3bvj4u7ct1r25kuso1_500.png/revision/latest?cb=20120522002256",
  "https://26.media.tumblr.com/tumblr_lyor7inqRF1qftn52o1_500.gif",
  "https://64.media.tumblr.com/tumblr_ly5t9nSRA31rnierho1_1280.jpg",
  "https://i.pinimg.com/736x/4c/bb/ad/4cbbad671777e931667ce41844a1d4a4.jpg",
  "https://i.pinimg.com/originals/9e/4b/ee/9e4beea17d4063470af7437da6c8376b.jpg",
  "https://i.pinimg.com/originals/94/6a/c0/946ac0fed49b04ba0a7d2b5266f454ce.jpg",
  "https://static.wikia.nocookie.net/adventuretimewithfinnandjake/images/4/4f/Clarence.png/revision/latest/scale-to-width/360?cb=20170506162555",
  "https://i.pinimg.com/736x/00/70/0a/00700a75b03cb2cad021b36918d1b83c.jpg",
  "https://i.pinimg.com/originals/d7/78/a2/d778a27c3417ab0cd68a6801bc1a94f1.jpg",
  "https://i.pinimg.com/originals/e5/30/eb/e530eba4da82f38edaed3aa9a8b38631.jpg",
  "https://static.wikia.nocookie.net/adventuretime/images/4/4f/Clarence.png/revision/latest/smart/width/250/height/250?cb=20140324213904&path-prefix=it",
  "https://static.wikia.nocookie.net/adventuretimewithfinnandjake/images/a/a1/Modelsheet_clarence_inarmorwithshield.jpg/revision/latest/scale-to-width-down/185?cb=20120224211536",
  "https://i.redd.it/zqdtnpxwv6n11.png",
  "https://static.wikia.nocookie.net/adventuretimewithfinnandjake/images/4/4f/Clarence.png/revision/latest/smart/width/386/height/259?cb=20170506162555",
  "https://64.media.tumblr.com/bbd716cebccabc342e26383ac79442ef/tumblr_inline_ndrmuwXycq1qzjzhu.gif",
  "https://static.wikia.nocookie.net/adventuretimewithfinnandjake/images/9/96/S3e24_Clarencealive.png/revision/latest/scale-to-width-down/185?cb=20120201230515",
  "https://static.wikia.nocookie.net/adventuretimewithfinnandjake/images/6/68/Modelsheet_clarence_ghostprincess_explodingfrommausoleum_-_specialpose.jpg/revision/latest/scale-to-width-down/185?cb=20120202184909",
  "https://i.pinimg.com/originals/a2/90/21/a290210d92397938f3463be70c421064.png",
  "https://i.pinimg.com/200x150/35/28/d5/3528d50913982190ebb3325780ddccd4.jpg",
  "https://i.pinimg.com/originals/4c/8f/f7/4c8ff709aae44818dffcb697a3de1c2c.png",
  "https://i.pinimg.com/736x/2a/11/92/2a119232a27657fd9ae6cb088601e03d--nice-place-rock-climbing.jpg",
  "https://i.pinimg.com/originals/ec/6f/89/ec6f89cd9a4ed85cd6f315ecc21c204d.jpg",
  "https://i.pinimg.com/originals/99/cd/11/99cd1124186bb48da09b334fedccef69.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Strawberry_vs_Peapod.svg/500px-Strawberry_vs_Peapod.svg.png",
  "https://image.slidesharecdn.com/presentation2-180216073748/95/e-bomb-9-638.jpg?cb=1518766791",
  "https://abcnoticias.mx/u/fotografias/m/2023/1/17/f960x540-195171_269246_5050.png",
  "https://image4.slideserve.com/9135949/classification-of-explosions-l.jpg",
  "https://static1.colliderimages.com/wordpress/wp-content/uploads/2021/07/TGF_506_PH_0745_RT_2.jpeg",
  "https://img.buzzfeed.com/buzzfeed-static/static/2018-04/3/16/asset/buzzfeed-prod-web-07/sub-buzz-23542-1522787241-2.jpg",
  "https://www.southwestjournal.com/wp-content/uploads/2023/08/Chevy-Sprint.jpg",
  "https://blog.cosasmolonas.com/wp-content/uploads/2013/09/reloj-carton-diy.jpg",
  "https://ic-ph-nss.xhcdn.com/a/ZDE4ZjY1M2MxNTNjNDY0YjM1ZDgwYTEyODA5ZGZmZjA/webp/000/517/478/055_1000.jpg",
  "https://plit.mx/wp-content/uploads/2020/12/olmeca.png",
  "https://img.wattpad.com/story_parts/1339809789/images/175b5f9fbed433c5906409958793.jpg",
  "https://img.itch.zone/aW1nLzE3NTA0NzAwLnBuZw==/original/AdszzB.png",
  "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2908470/capsule_616x353.jpg?t=1727366267",
  "https://images.scrolller.com/atto/best-futa-mom-put-there-eoiyqvfb5g.webp",
  "https://storytellergame.io/wp-content/uploads/2025/07/fnf-mom-rule-34.png",
  "https://www.desktophut.com/images/thumb_1673197712_422700.jpg",
  "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1644374084i/60377716.jpg",
  "https://cdn.donmai.us/sample/47/25/__mother_daughter_and_father_mcdonald_s_and_1_more_drawn_by_stanglassart_and_uraura_ura_chan__sample-4725dfb047c8bea61bf5c9d34412708f.jpg",
  "https://ecdn.teacherspayteachers.com/thumbitem/4-Dinosaur-Binder-Covers-and-Spines-9971755-1691454153/original-9971755-3.jpg",
  "https://images5.alphacoders.com/743/743554.png",
  "https://images6.alphacoders.com/137/thumb-1920-1378350.jpg",
  "https://images.wallpapersden.com/image/download/subaru-natsuki-4k-re-zero-starting-life-in-another-world_bWlrbG6UmZqaraWkpJRmbmdlrWZlbWU.jpg",
  "https://images.wallpapersden.com/image/download/subaru-natsuki-4k_a21qZmaUmZqaraWkpJRmbmdlrWZlbWU.jpg",
  "https://a-static.besthdwallpaper.com/natsuki-subaru-antagonist-wallpaper-1920x1080-57345_48.jpg",
  "https://images2.alphacoders.com/102/thumb-1920-1024814.png",
  "https://images5.alphacoders.com/100/1005348.jpg",
  "https://images2.alphacoders.com/720/thumb-1920-720104.png",
  "https://images3.alphacoders.com/778/thumb-1920-778481.jpg",
  "https://www.waterproofpaper.com/printable-maps/county-map/indiana-county-map.gif",
  "https://img.freepik.com/fotos-premium/sala-estar-minimalista-vacia-paneles-madera-piso-madera-ventana-grande_244125-1314.jpg?w=1480",
  "https://www.easterneye.biz/wp-content/uploads/2023/07/Lead-Smile-For-Me-The-Tigers-Biddu-2816.jpg",
  "https://mpmania.com/storage/2021/11/Bhad-Bhabie-Bi-Polar.jpg",
  "https://i1.sndcdn.com/artworks-vlaAHJ1xbkvajs5i-Y3seHQ-t500x500.jpg",
  "https://ukramer.com/media/2025/07/1751551538_541_Bhad-Bhabie-American-Express-позивається-через-майже-700-тисяч-боргу.jpg",
  "https://images.genius.com/c276aa53c9dc306f9b064bccf5f246a0.669x669x1.jpg",
  "https://www.gripeo.com/wp-content/uploads/2023/07/image-211-1024x1024.png",
  "https://wallpapers.com/images/hd/bhad-bhabie-style-icon-w455xhmkjnhzq0bi.jpg",
  "https://townsquare.media/site/812/files/2025/03/attachment-bhad-bhabie-photo.jpg?w=1200&q=75&format=natural",
  "https://www.hotnewhiphop.com/imgprst/2292x1200-fit-81-auto/cover/88/27/1635612788_2244239782c83891eff0ed5076e04a60.jpg",
  "https://ic-vt-nss.xhcdn.com/a/MjRmOTk2NTU3YTRhZTM0YzY2NWJlYThkODk0MmNiYzE/s(w:2560,h:1440),webp/024/914/927/v2/2560x1440.223.webp",
  "https://www.diapersissy.net/wp-content/uploads/2015/09/Copy-of-1_033-704x1024.jpg",
  "https://store.img-converter.com/aigenerator/txt2img/milf-xqszg.png",
  "https://1.bp.blogspot.com/-BNkWQzEPXvE/WhW-JudvqDI/AAAAAAAAgkA/EUvK6Ma5j7Ev8wQRWBhG5JFyjLb5xwspACKgBGAs/s1600/BridgitteB%2B%252817%2529.jpg",
  "https://tbib.org/images/5989/aa831dfe1f08d103a23e065196d50553115d2014.jpg",
  "http://www.outfittrends.com/wp-content/uploads/2015/05/v1.jpg",
  "https://w.wallhaven.cc/full/39/wallhaven-39lqj6.jpg",
  "http://blog.bigboobscelebrity.com/wp-content/uploads/2015/12/P101cc556-550x1024.jpg",
  "https://1.bp.blogspot.com/-ean5vwrY6GY/VzOHBmh6udI/AAAAAAABL00/CO90BEOKul8NrH6FREckGZiZQfMVVbuIACLcB/s1600/sQXSRDm4VlQ.jpg",
  "http://www.strangebeaver.com/wp-content/uploads/2013/03/glasses/1.jpg",
  "http://www.up-skirt-pics.com/gallery/bride/images/Brides167.jpg",
  "https://www.iftvmilfs.com/thumbs/1/565/09.jpg",
  "https://media.tenor.com/2xnASXr0l8cAAAAM/blonde-boobs.gif",
  "http://4.bp.blogspot.com/-TUsX_Ethz2Y/UxmpQ9jyb0I/AAAAAAAAByY/14kDvnDkp6Y/s1600/a5c390b3171527957df46075bff77109.jpg",
  "https://www.finditguide.com/images/map-ramstein-air-base-2000px.png",
  "https://cdn.wallpapersafari.com/9/44/yULH9P.jpg",
  "https://comohow.net/wp-content/uploads/2019/10/como-canalizar-las-emociones-600x450.jpg",
  "https://www.marthastewart.com/thmb/E7hD-IUF3C-gjuk1Rz_yU1swDKY=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/kate-ian-mmla102670dessert01_vert-d065ea2c18d8469a926c1a34e2a78b1c.jpg",
  "https://www.reviewjournal.com/wp-content/uploads/2017/06/8673300_web1_caprison2.jpg",
  "https://static.euronews.com/articles/stories/08/37/64/48/750x500_cmsv2_2e891e29-0982-5a18-a679-9174d25f7c20-8376448.jpg",
  "https://www.londonlocalnews.co.uk/wp-content/uploads/2025/01/Health-Benefits-of-Naked-Yoga-1536x864.jpg",
  "https://m.media-amazon.com/images/I/51iOI3U7v4L._SY522_.jpg",
  "https://fitfabguide.com/wp-content/uploads/2024/04/vecteezy_muscular-athlete-meditating-in-lotus-position-indoors_32944175_11zon-1024x574.jpg",
  "https://images.medindia.net/health-images/1200_1000/yoga-4.jpg",
  "https://www.cotribune.com/wp-content/uploads/2022/12/Untitled-design-18.png",
  "https://www.a4fitness.com/wp-content/uploads/2023/10/466641597410cca71638de27da3951c3-300x225.jpg",
  "https://yoga2all.com/wp-content/uploads/2022/06/yoga-2-1536x1024.jpg",
  "https://www.yogamindbody.net/wp-content/uploads/2023/10/yoga-benefits-of-man.jpg",
  "https://cdn.shopify.com/s/files/1/0522/2826/0008/files/19_benefits_yoga_3rd.jpg?v=1718876444",
  "https://as1.ftcdn.net/v2/jpg/00/96/28/24/1000_F_96282429_rERofmnSUnLHgrSOBkOZekZ8tqVkmTeU.jpg",
  "https://bookretreats.com/g/wp-content/uploads/2024/09/yoga-for-trauma-1-1024x682.jpeg",
  "https://www.verywellfit.com/thmb/n6vVXnASzIYc2FmEy1yvVJOLqBI=/400x250/filters:no_upscale():max_bytes(150000):strip_icc()/kundalini-56aa41b75f9b58b7d0035165.jpg",
  "https://d3pc1xvrcw35tl.cloudfront.net/sm/images/686x514/nude-yoga-benefits55_201907107286.jpg",
  "https://todayquote.in/wp-content/uploads/2023/01/cropped-naked-yoga.jpg",
  "https://www.boldsky.com/img/2015/07/01-1435739003-yoga4.jpg",
  "https://www.yogawiz.com/images/image-home/yoga-therapy-default.jpg",
  "https://www.classictruck.ca/image/cache/823315e79dd509fa8d1f85d189f75e37/3b3491447bfb1a2d3b2afb76b3bb72df.jpg",
  "https://images.campsites.co.uk/image/resource/1920/1300/either/family-camping-outdoor-holiday.webp",
  "https://images.hdqwalls.com/wallpapers/anime-girl-bluehair-4k-7c.jpg",
  "https://www.training.com.au/wp-content/uploads/dog-trainer.jpg",
  "https://highlandcanine.com/wp-content/uploads/2023/07/border-collie-jumping-agility-course.jpg",
  "https://www.hartz.com/wp-content/uploads/2021/10/Dog-Training-Basics-2.jpg",
  "https://images.ctfassets.net/sfnkq8lmu5d7/69K5cVKiWCTMJ7sXoUaWrF/7e347455e1145dc614e07d9ec3baabb2/Hero_-_Dog_agility_training.jpg?w=1000&h=750&fl=progressive&q=70&fm=jpg",
  "https://www.maydaydogtraining.com/images/hero-nick-01.JPG",
  "https://www.thesprucepets.com/thmb/g6-Z9IbTe_UZ4gEMucLGDAyYESQ=/750x0/filters:no_upscale():max_bytes(150000):strip_icc()/man-training-dogs-at-the-park-610255190-5c3fe5c746e0fb0001a302ff.jpg",
  "https://noosadogtraining.com.au/wp-content/uploads/Noosa-Dog-Traiing-Advanced-Classes-03-1920x1536.jpg",
  "https://dogtrainingelite.com/oak/files/images/group-classes/group-dog-training-class-153.jpg",
  "http://www.yokumgear.com/cdn/shop/articles/text-to-image_9e4cbf49-98bb-4b6d-906c-202126f6949e.png?v=1724493545",
  "https://agsd.club/wp-content/uploads/2018/12/Dog-training-Kabul-Afghanistan.jpg",
  "https://www.thesprucepets.com/thmb/N2wm4cEEt6fP4s6c4avG1Xz80C8=/2121x0/filters:no_upscale():strip_icc()/jump--992416282-5c4a07efc9e77c000110c9a3.jpg",
  "https://www.protectiondogs.co.uk/content/uploads/2023/01/Training-new-3000x0-c-default.jpg",
  "https://dogtrainingelite.com/oak/files/images/dogs/dog-training-128.jpg",
  "https://dogtrainingelite.com/oak/files/images/group-classes/group-dog-training-class-133.jpg",
  "https://www.theacademyofpetcareers.com/wp-content/uploads/2018/05/AdobeStock_55003778-scaled.jpeg",
  "https://www.internetvibes.net/wp-content/uploads/2019/01/Dog-Trainer.jpg",
  "https://www.masterdog-training.com/wp-content/uploads/2011/12/dog_training_los_angeles_sacramento_271.jpg",
  "https://dogsbestlife.com/wp-content/uploads/2021/09/large-dog-training-scaled.jpeg",
  "https://www.truecareveterinaryhospital.com/blog/wp-content/uploads/2023/02/iStock-822656476-2200x1467.jpg",
  "https://internationaldogtrainerschool.com/wp-content/uploads/2022/12/service-dog-practicing-lay-task-2048x1365.jpg",
  "https://pocketsuite.io/wp-content/uploads/2020/05/Styles-of-Dog-Trainers.jpg",
  "https://www.theacademyofpetcareers.com/wp-content/uploads/2022/09/img-inperson.jpg"
];

// ─── Local fallback assets (always available after first git pull) ─────────────
const LOCAL_MEMES = ['vawulence1.jpeg','vawulence2.jpeg','vawulence3.jpeg','v4.jpg','v5.png','v6.jpg','v7.webp','v8.jpg','v9.jpg','v10.jpg','v11.jpg','v12.jpg','v13.jpg','v14.jpg'];
const MEME_DIR    = path.join(__dirname, '..', 'assets', 'vawulence');

// ─── State: keep a shuffled deck so we don't repeat until we've seen all ─────
var _deck = [];
function nextUrl() {
    if (_deck.length === 0) {
        // Refill and shuffle
        _deck = MEME_POOL.slice();
        for (var i = _deck.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = _deck[i]; _deck[i] = _deck[j]; _deck[j] = t;
        }
    }
    return _deck.pop();
}

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── HTTP download ────────────────────────────────────────────────────────────
function downloadUrl(url) {
    return new Promise(function(resolve, reject) {
        var mod = url.startsWith('https') ? https : http;
        var req = mod.get(url.replace(/:large$/, ''), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Referer': 'https://www.google.com/' },
            timeout: 10000,
        }, function(r) {
            if ([301,302,303,307,308].indexOf(r.statusCode) !== -1 && r.headers.location)
                return downloadUrl(r.headers.location).then(resolve).catch(reject);
            if (r.status === 404 || r.statusCode === 403) return reject(new Error('HTTP ' + r.statusCode));
            var ct = (r.headers['content-type'] || '').split(';')[0].trim();
            if (!ct.startsWith('image/')) { r.resume(); return reject(new Error('Not image: ' + ct)); }
            var chunks = [];
            r.on('data', function(c) { chunks.push(c); });
            r.on('end', function() { resolve({ buf: Buffer.concat(chunks), ct: ct }); });
        });
        req.on('error', reject);
        req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
    });
}

// ─── Local fallback ───────────────────────────────────────────────────────────
function pickLocal() {
    var shuffled = LOCAL_MEMES.slice().sort(function() { return Math.random() - 0.5; });
    for (var i = 0; i < shuffled.length; i++) {
        var f = path.join(MEME_DIR, shuffled[i]);
        if (fs.existsSync(f)) {
            var buf = fs.readFileSync(f);
            var ext = shuffled[i].split('.').pop().toLowerCase();
            return { buf: buf, ct: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' };
        }
    }
    return null;
}

// ─── Plugin export ────────────────────────────────────────────────────────────
module.exports = {
    name: 'vawulence',
    aliases: ['vaw', 'vawy', 'violence'],
    description: 'Random Pepe-frog vawulence meme (251 image pool) with Naija Pidgin caption',
    usage: '.vawulence [optional topic]',

    async execute(sock, m, args) {
        var topic = args.length ? args.join(' ').trim() : null;
        var caption = randItem(CAPTIONS);
        if (topic) caption = '\ud83d\udc38\ud83d\udd25 *' + topic + ' Vawulence*\n\n' + caption;

        await m.react('\u23f3');

        var imgData = null;

        // Try up to 5 random URLs from the shuffled deck
        for (var attempt = 0; attempt < 5; attempt++) {
            try {
                var url = nextUrl();
                imgData = await downloadUrl(url);
                break;
            } catch (_) { /* try next slot */ }
        }

        // Fallback: local assets
        if (!imgData) imgData = pickLocal();

        try {
            if (imgData) {
                await sock.sendMessage(m.from, { image: imgData.buf, caption: caption, mimetype: imgData.ct }, { quoted: m.raw });
            } else {
                await m.reply('\ud83d\udc38\ud83d\udd25 VAWULENCE!!\n\n' + caption);
            }
            await m.react('\ud83d\udd25');
        } catch (_) {
            await m.reply('\ud83d\udc38\ud83d\udd25 VAWULENCE!!\n\n' + caption);
            await m.react('\ud83d\udd25');
        }
    },
};
