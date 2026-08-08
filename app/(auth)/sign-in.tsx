import React from "react";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { AuthField, AuthScreen } from "@/components/AuthScreen";

/** The second factors this screen can collect a code for. */
type MfaStrategy = "totp" | "phone_code" | "email_code" | "backup_code";

/**
 * Which second factor to offer when the account has several. Authenticator
 * codes need no round trip, so they come first; backup codes are the last
 * resort because using one spends it.
 */
const MFA_PREFERENCE: MfaStrategy[] = [
  "totp",
  "phone_code",
  "email_code",
  "backup_code",
];

const MFA_COPY: Record<MfaStrategy, { subtitle: string; placeholder: string }> =
  {
    totp: {
      subtitle: "Enter the code from your authenticator app.",
      placeholder: "Enter your 6-digit code",
    },
    phone_code: {
      subtitle: "Enter the code we texted you.",
      placeholder: "Enter your verification code",
    },
    email_code: {
      subtitle: "Enter the code we emailed you.",
      placeholder: "Enter your verification code",
    },
    backup_code: {
      subtitle: "Enter one of your backup codes.",
      placeholder: "Enter a backup code",
    },
  };

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [mfaStrategy, setMfaStrategy] = React.useState<MfaStrategy>();

  // The Convex user row is created by app/(protected)/_layout.tsx, which both
  // this flow and sign-up pass through.

  const finalizeSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          console.log(session.currentTask);
          return;
        }

        router.replace("/home");
      },
    });
  };

  /**
   * Picks a supported second factor and, for the two that are delivered rather
   * than generated on the device, sends the code.
   */
  const startSecondFactor = async () => {
    const supported = signIn.supportedSecondFactors ?? [];

    const strategy = MFA_PREFERENCE.find((candidate) =>
      supported.some((factor) => factor.strategy === candidate),
    );

    if (!strategy) {
      console.error(
        "Sign-in needs a second factor, but none of the supported strategies " +
          "can be collected here:",
        supported,
      );
      return;
    }

    setMfaStrategy(strategy);

    if (strategy === "phone_code") {
      await signIn.mfa.sendPhoneCode();
    } else if (strategy === "email_code") {
      await signIn.mfa.sendEmailCode();
    }
  };

  const resendCode = async () => {
    if (mfaStrategy === "phone_code") {
      await signIn.mfa.sendPhoneCode();
    } else if (mfaStrategy === "email_code") {
      await signIn.mfa.sendEmailCode();
    }
  };

  const startOver = () => {
    setMfaStrategy(undefined);
    setCode("");
    signIn.reset();
  };

  const handleSubmit = async () => {
    const { error } = await signIn.password({
      emailAddress,
      password,
    });
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
    } else if (signIn.status === "needs_second_factor") {
      await startSecondFactor();
    } else if (signIn.status === "needs_client_trust") {
      // New-device verification always arrives by email.
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );

      if (emailCodeFactor) {
        setMfaStrategy("email_code");
        await signIn.mfa.sendEmailCode();
      }
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  const handleVerify = async () => {
    switch (mfaStrategy) {
      case "totp":
        await signIn.mfa.verifyTOTP({ code });
        break;
      case "phone_code":
        await signIn.mfa.verifyPhoneCode({ code });
        break;
      case "backup_code":
        await signIn.mfa.verifyBackupCode({ code });
        break;
      default:
        await signIn.mfa.verifyEmailCode({ code });
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  const isFetching = fetchStatus === "fetching";

  const needsCode =
    signIn.status === "needs_second_factor" ||
    signIn.status === "needs_client_trust";

  if (needsCode) {
    const strategy = mfaStrategy ?? "email_code";
    const copy = MFA_COPY[strategy];
    // Backup codes are alphanumeric; every other factor is digits only.
    const isNumericCode = strategy !== "backup_code";
    const canResend = strategy === "phone_code" || strategy === "email_code";

    return (
      <AuthScreen title="Verify it's you" subtitle={copy.subtitle}>
        <VStack space="lg">
          <AuthField
            label={
              strategy === "backup_code" ? "Backup code" : "Verification code"
            }
            error={errors?.fields?.code?.message}
          >
            <Input className="h-11 rounded-xl bg-card">
              <InputField
                value={code}
                placeholder={copy.placeholder}
                onChangeText={setCode}
                autoCapitalize="none"
                keyboardType={isNumericCode ? "numeric" : "default"}
                className="text-foreground"
              />
            </Input>
          </AuthField>

          <Button
            size="lg"
            className="rounded-xl"
            isDisabled={isFetching || !code}
            onPress={handleVerify}
          >
            <ButtonText>Verify</ButtonText>
          </Button>

          <VStack className="items-center">
            {canResend && (
              <Button variant="link" size="sm" onPress={resendCode}>
                <ButtonText>I need a new code</ButtonText>
              </Button>
            )}

            <Button variant="link" size="sm" onPress={startOver}>
              <ButtonText>Start over</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Sign in"
      subtitle="Pick up your trip where you left off."
      footer={
        <HStack space="xs" className="items-center justify-center">
          <Text size="sm" className="text-muted-foreground">
            Don&apos;t have an account?
          </Text>
          <Link href="/sign-up" asChild>
            <Button variant="link" size="sm" className="px-0">
              <ButtonText>Sign up</ButtonText>
            </Button>
          </Link>
        </HStack>
      }
    >
      <VStack space="lg">
        <AuthField
          label="Email address"
          error={errors?.fields?.identifier?.message}
        >
          <Input className="h-11 rounded-xl bg-card">
            <InputField
              autoCapitalize="none"
              value={emailAddress}
              placeholder="you@example.com"
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              className="text-foreground"
            />
          </Input>
        </AuthField>

        <AuthField label="Password" error={errors?.fields?.password?.message}>
          <Input className="h-11 rounded-xl bg-card">
            <InputField
              value={password}
              placeholder="Enter password"
              secureTextEntry={true}
              onChangeText={setPassword}
              className="text-foreground"
            />
          </Input>
        </AuthField>

        <Button
          size="lg"
          className="rounded-xl"
          isDisabled={!emailAddress || !password || isFetching}
          onPress={handleSubmit}
        >
          <ButtonText>Continue</ButtonText>
        </Button>
      </VStack>
    </AuthScreen>
  );
}
