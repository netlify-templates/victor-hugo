+++
title = "Gradle and NixOS"
subtitle = "Gradle made me love NixOS even more"
date = "2018-07-02T21:21:15+01:00"
months = [ "2018-07" ]
authors = [ "josé-san-leandro" ]
authorPhoto = "josé-san-leandro.jpg"
draft = "false"
tags = [ "osoco", "gradle", "nixos", "bash", "linux" ]
summary = "Gradle uses a native library that does not fit with NixOS out of the box. There're several choices to fix it."
background = "elephant.jpg"
backgroundSummary = "elephant.jpg"
+++

# NixOS

[NixOS](https://nixos.org) is a Linux distribution that manages changes in the configuration and installed packages, in a declarative way.
It also keeps tracks of the changes, so you can go back in time to the system as it was before your changes.
It's a bit like Puppet, but more ambitious. It takes care of everything for you, excepting your home and additional folders outside your home, that you manage yourself.

{{<figure src="/images/thoughts/nixos.png">}}

It is able to do that by mounting the `/nix/store` file system read-only, which is where all system packages get installed.

NixOS reads the desired system state (including the users, packages, configurations, filesystems, etc.) from a configuration file, and commits the new state.

This approach implies NixOS is not compatible with [FSH](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard), and some files or libraries won't be able to find their dependencies unless we tell them where they are.

That's the duty of the package maintainers. The files each package installs need to be reviewed to check if they rely upon dynamic dependencies which are expected to be found in folders such as `/usr/lib`. For all affected files, NixOS provides a tool called [patchelf](https://nixos.org/patchelf.html) to change where to look for the external dependencies.

# Gradle

The Linux ports of [Gradle](https://gradle.org) and Gradle Wrapper include a native library: `libnative-platform.so`.
That library has some dynamic dependencies, so it won't work out of the box.

{{<figure src="/images/thoughts/gradle.png">}}

One way to fix it is to declare Gradle to be installed in the system. That would patch the native library.

However, that's not always convenient. In particular, it fights against the very purpose of Gradle Wrapper.
It also makes [sdkman](https://sdkman.io) inconvenient to deal with Gradle installations.

# The problem

We'd like to use the Gradle distributions installed from sdkman or Gradle Wrapper distributions, while still enjoying our NixOS-managed system.

When we install a new version of Gradle, or run `./gradlew`, we get a `No such file or directory error`.
That doesn't seem obvious, but it's caused by an unresolved dynamic library.

It gets clear if we run `ldd` on the native library, in this case under `~/.gradle/native/25/linux-amd64/`:

```bash
> ldd ~/.gradle/native/25/linux-amd64/libnative-platform.so
ldd: warning: you do not have execution permission for `/home/user/.gradle/native/25/linux-amd64/libnative-platform.so'
        linux-vdso.so.1 (0x00007fffaa5ea000)
        libstdc++.so.6 => not found
        libm.so.6 => /nix/store/2kcrj1ksd2a14bm5sky182fv2xwfhfap-glibc-2.26-131/lib/libm.so.6 (0x00007f848b7d6000)
        libgcc_s.so.1 => /nix/store/2kcrj1ksd2a14bm5sky182fv2xwfhfap-glibc-2.26-131/lib/libgcc_s.so.1 (0x00007f848b5c0000)
        libc.so.6 => /nix/store/2kcrj1ksd2a14bm5sky182fv2xwfhfap-glibc-2.26-131/lib/libc.so.6 (0x00007f848b20e000)
        /nix/store/2kcrj1ksd2a14bm5sky182fv2xwfhfap-glibc-2.26-131/lib64/ld-linux-x86-64.so.2 (0x00007f848bd27000)
```

# The solution

As explained before, we could create and maintain a number of Nixpkgs packages for each Gradle version. But even if we choose that path, that would not work neither with Gradle Wrapper, nor with SDKMAN-installed Gradle distributions.

I'm describing here a different approach: a shell script that resolves the `libstdc++.so.6` dependency manually.

```bash
## Finds out the location of the libstdc++.so.6 library.
function find_stdcplusplus_in_nix_store() {
    local _fileName="libstdc++.so.6";

    ls /nix/store | grep "gcc" | grep "lib" \
    | awk -v file="${_fileName}" '{printf("find /nix/store/%s -name %s\n", $0, file);}' | sh \
    | awk -F'-' '{printf("%s %s\n", $3, $0);}' | sort | tail -n 1 | awk '{print $2;}'
}
```

This function uses the latest GCC version installed in the system. A better approach would be to use [nix-build](https://nixos.wiki/wiki/Cheatsheet#Get_the_store_path_for_a_package) instead, but this has proven itself useful anyway.

In my system,

```bash
> find_stdcplusplus_in_nix_store
/nix/store/vz5q4hi1rdc91llnrrd5dfvqw3xn4sgw-gcc-7.3.0-lib/lib/libstdc++.so.6
```

So far, we know where is the dependency `libnative-platform.so` depends on, and is not able to find.
We need to run `patchelf` to change its `rpath` so that it includes the folder `libstdc++.so.6` is in.

The parent folder of any file can be obtained with `dirname`, so a trivial function to get the parent folder of `libstdc++.so.6` would be:

```bash
## Finds out the location of the folder containing the libstdc++.so.6 library.
function find_stdcplusplus_parent_folder_in_nix_store() {
    local _folder="$(find_stdcplusplus_in_nix_store)";
    dirname "${_folder}";
}
```

Running it gives the expected result. No surprises here.

```bash
> find_stdcplusplus_parent_folder_in_nix_store
/nix/store/vz5q4hi1rdc91llnrrd5dfvqw3xn4sgw-gcc-7.3.0-lib/lib
```

Now we need to patch the file. If we were to do it manually, we'd run:
```bash
> patchelf --set-rpath /nix/store/vz5q4hi1rdc91llnrrd5dfvqw3xn4sgw-gcc-7.3.0-lib/lib \
~/.gradle/native/25/linux-amd64/libnative-platform.so'
```

However, we can do it for all versions of the file just as easily:
```bash
function patch_gradle_libnativeplatform() {
    local _rpath="$(find_stdcplusplus_parent_folder_in_nix_store)";
    find ~/.gradle/native -name libnative-platform.so -exec patchelf --set-rpath "${_rpath}" {} \;
}
```

We just need to run this function once we install a new Gradle distribution, or even better, once we get the `No such file or directory` error.

## Credits

- **Images**:
  - <a href="https://pixabay.com/en/elephant-africa-african-elephant-111695/" target="_blank_">Elephant</a>, from Pixabay, licensed under <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0 Creative Commons</a>.
  - <a href="https://avatars3.githubusercontent.com/u/124156" target="_blank">Gradle logo</a>, from <a href="https://gradle.org/">Gradle.org</a>.
  - <a href="https://nixos.org/logo/nixos-hires.png">NixOS logo</a>, licensed under the <a href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.






