import { Surface, TelemetryProps } from './types';

/**
 * Detect a CI environment so CI-driven runs can be filtered out downstream. Reads
 * only well-known CI env flags — never their values.
 */
export function detectCI(env: NodeJS.ProcessEnv = process.env): boolean {
    return !!(
        env.CI ||
        env.CONTINUOUS_INTEGRATION ||
        env.GITHUB_ACTIONS ||
        env.GITLAB_CI ||
        env.BUILDKITE ||
        env.CIRCLECI ||
        env.TF_BUILD
    );
}

/**
 * The content-free props attached to every event. Strictly non-identifying:
 * `os` is the coarse platform string (`win32`/`darwin`/`linux`), never a machine
 * name; there is no path, title, slug, or project data here by construction.
 */
export function buildCommonProps(input: {
    surface: Surface;
    loomVersion: string;
    env?: NodeJS.ProcessEnv;
}): TelemetryProps {
    return {
        surface: input.surface,
        loom_version: input.loomVersion,
        os: process.platform,
        is_ci: detectCI(input.env ?? process.env),
    };
}
