# Chobi Dao launch video

The Remotion composition is a 60-second, 1920×1080, 30 fps launch explainer built from animated React scenes and product UI illustrations. The timed narration is in [voiceover.md](./voiceover.md).

## Install and render

From `web/`:

1. Install the video dependencies: `npm install` (Remotion and its CLI are in `devDependencies`).
2. Preview and scrub the composition: `npm run video:studio`.
3. Render the MP4: `npm run video:render`.
4. The render is written to `video/out/chobi-dao-launch.mp4`.

The rendered composition currently has no audio track. Record the supplied narration separately and add it in Remotion or an editor to produce the narrated master. No voice synthesis credentials or local TTS engine are configured in this workspace.

The illustrations are original interface mockups based on the current app flows; the event and photo details shown are examples for the video, not live customer data.
