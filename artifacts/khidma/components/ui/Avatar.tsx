import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { gradient } from "@/constants/colors";

type Props = {
  name: string;
  size?: number;
  online?: boolean;
  uri?: string | null;
};

export function Avatar({ name, size = 44, online, uri }: Props) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  // Track image load failures so a broken URL falls back to initials
  // instead of showing a blank circle.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showImage = !!uri && !failed;

  return (
    <View style={{ width: size, height: size }}>
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          onError={() => setFailed(true)}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      ) : (
        <LinearGradient
          colors={gradient.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text style={[styles.text, { fontSize: size * 0.38 }]}>
            {initials || "?"}
          </Text>
        </LinearGradient>
      )}
      {online ? (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              borderWidth: size * 0.045,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#39E2C2",
    borderColor: "#fff",
  },
});
