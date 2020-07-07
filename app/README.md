![](static/favicon.ico) 
# drop

Secure encrypted temporal file storage.

## Description

Files can only accessed via this unique url returned after upload. They are encrypted with [AES-256](https://tools.ietf.org/html/rfc3565) and stored in a postgres database. The database dosen't have decryption information stored and once the link is lost, the file cannot be retrieved (not even from the admin).

Files are delete after **5** minutes (`expire_time` parameter) or if all the download quotas are used.

## Usage & Parameters

- With every parameter set

```bash
curl --upload-file $filepath http://$host/storage/$filename?salt=$salt&expire_count=$expire_count&expire_time=$expire_time
```

- Without every parameter set

```bash
curl --upload-file $filepath http://$host/storage/$filename
```

**Parameters**

| Name | Type | Default | Description |
| -: | :-: | :-: | :- |
| `salt`         | `hex` |  `rng` | Defines the encryption salt                         |
| `expire_time`  | `int` |  1     | Defines the minutes until expiration (9 max)        |
| `expire_count` | `int` |  1     | Defines the download count until expiration (9 max) |

> Note
>
> Every Parameter is optional and will have a default value / calcualted value during request.
>
> Only salt will be returned with the download link.


**Example**

```bash
curl --upload-file sample.txt http://localhost/storage/sample.txt?salt=2d892b3e&expire_count=1&expire_time=5
```

On success, the server will return a download link for the stored file.

```bash
http://$host/storage/$filename?salt=$salt
```
**Example**

```bash
http://localhost/storage/sample.txt?salt=2d892b3e
```